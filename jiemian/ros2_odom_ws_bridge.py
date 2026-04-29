#!/usr/bin/env python3
"""
ROS2 Humble: 订阅 /odom 并通过 WebSocket 向网页广播位姿。

默认地址:
  ws://0.0.0.0:8765/agv_pose
"""

import asyncio
import json
import math
import threading
from typing import Set

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node
from websockets import serve


def quaternion_to_yaw(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


class OdomBridgeNode(Node):
    def __init__(self) -> None:
        super().__init__("odom_ws_bridge")
        self.latest_message = {}
        self.lock = threading.Lock()

        self.declare_parameter("topic", "/odom")
        self.declare_parameter("agv_id", 1)

        topic = self.get_parameter("topic").get_parameter_value().string_value
        self.agv_id = int(self.get_parameter("agv_id").get_parameter_value().integer_value or 1)
        self.create_subscription(Odometry, topic, self.on_odom, 20)
        self.get_logger().info(f"订阅里程计话题: {topic}")

    def on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        yaw = quaternion_to_yaw(q.x, q.y, q.z, q.w)
        p = msg.pose.pose.position
        t = msg.twist.twist

        payload = {
            "topic": "agv_pose",
            "data": {
                "id": self.agv_id,
                "frame_id": msg.header.frame_id,
                "child_frame_id": msg.child_frame_id,
                "x": float(p.x),
                "y": float(p.y),
                "z": float(p.z),
                "yaw": float(yaw),
                "vx": float(t.linear.x),
                "vy": float(t.linear.y),
                "wz": float(t.angular.z),
                "stamp_sec": int(msg.header.stamp.sec),
                "stamp_nanosec": int(msg.header.stamp.nanosec),
            },
        }
        with self.lock:
            self.latest_message = payload


async def broadcaster(node: OdomBridgeNode, clients: Set) -> None:
    while rclpy.ok():
        with node.lock:
            data = node.latest_message
        if data and clients:
            text = json.dumps(data, ensure_ascii=False)
            stale_clients = []
            for ws in list(clients):
                try:
                    await ws.send(text)
                except Exception:
                    stale_clients.append(ws)
            for ws in stale_clients:
                clients.discard(ws)
        await asyncio.sleep(0.05)  # 20Hz


async def main_async() -> None:
    rclpy.init()
    node = OdomBridgeNode()
    clients = set()

    def ros_spin():
        rclpy.spin(node)

    spin_thread = threading.Thread(target=ros_spin, daemon=True)
    spin_thread.start()

    async def handler(websocket, path=None):
        req_path = path
        if req_path is None:
            req_path = getattr(websocket, "path", None)
        if req_path is None:
            request_obj = getattr(websocket, "request", None)
            req_path = getattr(request_obj, "path", None) if request_obj else None
        if req_path != "/agv_pose":
            await websocket.close(code=1008, reason="Invalid path")
            return
        clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            clients.discard(websocket)

    node.get_logger().info("WebSocket 服务已启动: ws://0.0.0.0:8765/agv_pose")
    async with serve(handler, "0.0.0.0", 8765, ping_interval=20, ping_timeout=20):
        await broadcaster(node, clients)


def main():
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        pass
    finally:
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
