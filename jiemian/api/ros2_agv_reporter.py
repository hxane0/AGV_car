#!/usr/bin/env python3
"""
ROS2 → Django AGV 状态上报脚本
在 Ubuntu 虚拟机上运行，订阅 ROS2 话题，将数据推送给 Windows 上的 Django API。

使用前必须修改：
    DJANGO_API_URL = "http://【Windows的IP】:8000/api/v1/agv/report"
    Windows IP 查询方法：在 Windows CMD 里运行 ipconfig，找"以太网"或"WLAN"的 IPv4 地址

启动方法：
    source /opt/ros/humble/setup.bash
    python3 ros2_agv_reporter.py
"""

import math
import threading
import time
import urllib.request
import urllib.error
import json

# ══════════════════════════════════════════════════════════
#  ★ 修改这里：填写 Windows 电脑的 IP 地址 ★
#    在 Windows CMD 里运行 ipconfig 查看
# ══════════════════════════════════════════════════════════
DJANGO_API_URL = "http://192.168.0.101:8000/api/v1/agv/report"

# AGV 基本信息
AGV_ID    = 1
AGV_NAME  = "AGV-001"
AGV_MODEL = "R550"

# ROS2 话题名
ODOM_TOPIC    = "/odom"
VOLTAGE_TOPIC = "/PowerVoltage"

# 电压 → 电量百分比换算区间（根据你的电池实际修改）
MIN_VOLTAGE = 22.0   # 对应 0%
MAX_VOLTAGE = 25.2   # 对应 100%

# 速度阈值：绝对值超过此值认为"运行中"，否则"空闲"
RUNNING_SPEED_THRESHOLD = 0.05

# 上报频率（秒）：每隔多久向 Django 推送一次（即使数据未变化）
REPORT_INTERVAL = 0.5
# ══════════════════════════════════════════════════════════


def quaternion_to_yaw_degrees(orientation):
    siny = 2.0 * (orientation.w * orientation.z + orientation.x * orientation.y)
    cosy = 1.0 - 2.0 * (orientation.y ** 2 + orientation.z ** 2)
    return math.degrees(math.atan2(siny, cosy))


def voltage_to_battery(v, vmin, vmax):
    if vmax <= vmin:
        return 0.0
    pct = (v - vmin) / (vmax - vmin) * 100.0
    return round(max(0.0, min(100.0, pct)), 1)


class AgvState:
    def __init__(self):
        self.lock = threading.Lock()
        self.data = {
            "agv_id":    AGV_ID,
            "agv_name":  AGV_NAME,
            "agv_model": AGV_MODEL,
            "status":    "idle",
            "battery":   0.0,
            "position_x": 0.0,
            "position_y": 0.0,
            "position_z": 0.0,
            "orientation": 0.0,
            "speed":     0.0,
        }
        self.odom_received    = False
        self.voltage_received = False

    def update_odom(self, msg):
        yaw   = quaternion_to_yaw_degrees(msg.pose.pose.orientation)
        speed = float(msg.twist.twist.linear.x)
        with self.lock:
            self.data["position_x"]  = float(msg.pose.pose.position.x)
            self.data["position_y"]  = float(msg.pose.pose.position.y)
            self.data["position_z"]  = float(msg.pose.pose.position.z)
            self.data["orientation"] = round(yaw, 2)
            self.data["speed"]       = round(speed, 4)
            self.data["status"]      = "running" if abs(speed) > RUNNING_SPEED_THRESHOLD else "idle"
            self.odom_received = True

    def update_voltage(self, msg):
        battery = voltage_to_battery(float(msg.data), MIN_VOLTAGE, MAX_VOLTAGE)
        with self.lock:
            self.data["battery"] = battery
            self.voltage_received = True

    def snapshot(self):
        with self.lock:
            return dict(self.data)


def post_to_django(state: AgvState):
    """独立线程：定时将最新状态 POST 到 Django。"""
    print(f"[上报] 目标地址: {DJANGO_API_URL}")
    consecutive_errors = 0

    while True:
        time.sleep(REPORT_INTERVAL)

        if not state.odom_received:
            print("[上报] 等待 /odom 第一帧...")
            continue

        payload = json.dumps(state.snapshot()).encode("utf-8")
        req = urllib.request.Request(
            DJANGO_API_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                body = resp.read().decode()
                consecutive_errors = 0
                spd = state.snapshot()["speed"]
                bat = state.snapshot()["battery"]
                print(f"[上报] ✓  speed={spd:.3f} m/s  battery={bat:.1f}%  → {body}")
        except urllib.error.URLError as e:
            consecutive_errors += 1
            if consecutive_errors == 1 or consecutive_errors % 10 == 0:
                print(f"[上报] ✗  无法连接 Django（{e.reason}）——请确认 Windows 上 Django 已启动，IP 正确")
        except Exception as e:
            consecutive_errors += 1
            print(f"[上报] ✗  {e}")


def main():
    try:
        import rclpy
        from rclpy.node import Node
        from nav_msgs.msg import Odometry
        from std_msgs.msg import Float32
    except ImportError:
        print("错误：找不到 rclpy，请先执行：source /opt/ros/humble/setup.bash")
        return

    state = AgvState()

    # 启动上报线程
    reporter = threading.Thread(target=post_to_django, args=(state,), daemon=True)
    reporter.start()

    # 启动 ROS2 节点
    rclpy.init()

    class AgvReporterNode(Node):
        def __init__(self):
            super().__init__("agv_reporter")
            self.create_subscription(Odometry, ODOM_TOPIC, state.update_odom, 10)
            self.create_subscription(Float32, VOLTAGE_TOPIC, state.update_voltage, 10)
            self.get_logger().info(f"已订阅: {ODOM_TOPIC}  {VOLTAGE_TOPIC}")
            self.get_logger().info(f"上报目标: {DJANGO_API_URL}")

    node = AgvReporterNode()
    print(f"AGV 上报程序已启动，按 Ctrl+C 停止")
    print(f"如果一直显示「等待 /odom 第一帧」，请确认小车底盘 ROS2 节点已启动")

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        print("\n已停止")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
