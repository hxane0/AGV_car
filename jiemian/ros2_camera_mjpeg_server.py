#!/usr/bin/env python3
"""
ROS2 Humble: 订阅 /camera/color/image_raw 并通过 HTTP 输出 MJPEG。

默认访问地址:
  http://0.0.0.0:8080/stream
"""

import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import Image


class CameraMjpegBridge(Node):
    def __init__(self) -> None:
        super().__init__("camera_mjpeg_bridge")
        self.bridge = CvBridge()
        self.latest_jpeg = None
        self.lock = threading.Lock()

        self.declare_parameter("topic", "/camera/color/image_raw")
        topic = self.get_parameter("topic").get_parameter_value().string_value

        self.create_subscription(Image, topic, self.on_image, 10)
        self.get_logger().info(f"订阅图像话题: {topic}")

    def on_image(self, msg: Image) -> None:
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
            ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not ok:
                return
            with self.lock:
                self.latest_jpeg = buf.tobytes()
        except Exception as exc:
            self.get_logger().warning(f"图像编码失败: {exc}")


def make_handler(bridge: CameraMjpegBridge):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/healthz"):
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"ok")
                return

            if not self.path.startswith("/stream"):
                self.send_response(404)
                self.end_headers()
                return

            self.send_response(200)
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.send_header("Connection", "close")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.end_headers()

            try:
                while True:
                    with bridge.lock:
                        jpg = bridge.latest_jpeg
                    if jpg is None:
                        continue

                    self.wfile.write(b"--frame\r\n")
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(jpg)}\r\n\r\n".encode("ascii"))
                    self.wfile.write(jpg)
                    self.wfile.write(b"\r\n")
            except Exception:
                # 浏览器断开连接时会走到这里，静默即可
                return

        def log_message(self, _format, *_args):
            return

    return Handler


def main():
    rclpy.init()
    bridge = CameraMjpegBridge()

    server = ThreadingHTTPServer(("0.0.0.0", 8080), make_handler(bridge))
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    bridge.get_logger().info("MJPEG 服务已启动: http://0.0.0.0:8080/stream")

    try:
        rclpy.spin(bridge)
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        bridge.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
