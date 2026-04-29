#!/usr/bin/env python3
"""
ROS2 相机 MJPEG 推流服务
订阅 /camera/color/image_raw，通过 HTTP 在 0.0.0.0:8080/stream 提供 MJPEG 流。

使用方法（在 Ubuntu 虚拟机上）：
  source /opt/ros/humble/setup.bash
  python3 camera_stream_server.py

依赖：
  pip3 install opencv-python
  （rclpy、sensor_msgs 由 ROS2 环境提供）
"""

import threading
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
import cv2
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── 配置 ──────────────────────────────────────────────────────────────────────
ROS_TOPIC   = '/camera/color/image_raw'
HTTP_HOST   = '0.0.0.0'
HTTP_PORT   = 8080
JPEG_QUALITY = 80   # 0-100，越高质量越好但带宽越大
# ─────────────────────────────────────────────────────────────────────────────

_frame_lock  = threading.Lock()
_latest_jpeg = None   # 最新一帧的 JPEG bytes


class CameraSubscriber(Node):
    def __init__(self):
        super().__init__('camera_mjpeg_server')
        self.subscription = self.create_subscription(
            Image,
            ROS_TOPIC,
            self._on_image,
            10
        )
        self.get_logger().info(f'已订阅话题: {ROS_TOPIC}')

    def _on_image(self, msg: Image):
        global _latest_jpeg
        encoding = msg.encoding.lower()
        np_arr = np.frombuffer(msg.data, dtype=np.uint8).reshape(msg.height, msg.width, -1)

        if encoding in ('rgb8', 'rgb'):
            bgr = cv2.cvtColor(np_arr, cv2.COLOR_RGB2BGR)
        elif encoding in ('bgr8', 'bgr'):
            bgr = np_arr
        elif encoding in ('mono8',):
            bgr = cv2.cvtColor(np_arr.squeeze(), cv2.COLOR_GRAY2BGR)
        else:
            # 未知编码，尝试直接用
            bgr = np_arr

        ok, buf = cv2.imencode('.jpg', bgr, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if ok:
            with _frame_lock:
                _latest_jpeg = buf.tobytes()


class MjpegHandler(BaseHTTPRequestHandler):
    BOUNDARY = b'--mjpegboundary'

    def log_message(self, fmt, *args):
        pass  # 关闭每帧的 HTTP 日志，保持终端整洁

    def do_GET(self):
        if self.path.startswith('/stream'):
            self._serve_stream()
        else:
            self.send_error(404)

    def _serve_stream(self):
        self.send_response(200)
        self.send_header('Content-Type',
                         'multipart/x-mixed-replace; boundary=mjpegboundary')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()

        print(f'[stream] 客户端已连接: {self.client_address[0]}')
        try:
            while True:
                with _frame_lock:
                    frame = _latest_jpeg

                if frame is None:
                    # 还没收到第一帧，稍等
                    import time; time.sleep(0.05)
                    continue

                header = (
                    b'\r\n' + self.BOUNDARY + b'\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(len(frame)).encode() + b'\r\n\r\n'
                )
                self.wfile.write(header + frame)
                self.wfile.flush()

                import time; time.sleep(1 / 30)   # 限制到 30 FPS
        except (BrokenPipeError, ConnectionResetError):
            print(f'[stream] 客户端断开: {self.client_address[0]}')


def spin_ros(node):
    rclpy.spin(node)


def main():
    rclpy.init()
    node = CameraSubscriber()

    # ROS2 spin 放到后台线程，主线程跑 HTTP 服务
    ros_thread = threading.Thread(target=spin_ros, args=(node,), daemon=True)
    ros_thread.start()

    server = HTTPServer((HTTP_HOST, HTTP_PORT), MjpegHandler)
    print(f'MJPEG 服务已启动: http://{HTTP_HOST}:{HTTP_PORT}/stream')
    print(f'前端流地址填写:   http://192.168.0.100:{HTTP_PORT}  （路径 /stream）')
    print('按 Ctrl+C 停止')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止')
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
