import math

from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections
from django.utils import timezone

from EmployeeApp.models import Agv, AgvLatestStatus


def quaternion_to_yaw_degrees(orientation):
    siny_cosp = 2.0 * (orientation.w * orientation.z + orientation.x * orientation.y)
    cosy_cosp = 1.0 - 2.0 * (orientation.y * orientation.y + orientation.z * orientation.z)
    return math.degrees(math.atan2(siny_cosp, cosy_cosp))


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def voltage_to_battery_percent(voltage, min_voltage, max_voltage):
    if max_voltage <= min_voltage:
        return 0.0
    ratio = (float(voltage) - float(min_voltage)) / (float(max_voltage) - float(min_voltage))
    return round(clamp(ratio * 100.0, 0.0, 100.0), 1)


class Command(BaseCommand):
    help = "Subscribe Wheeltec ROS2 topics and persist latest status into MySQL."

    def add_arguments(self, parser):
        parser.add_argument(
            "--agv-id",
            type=int,
            default=1,
            help="AGV ID stored in MySQL, default: 1",
        )
        parser.add_argument(
            "--agv-name",
            default="AGV-001",
            help="AGV name stored in MySQL, default: AGV-001",
        )
        parser.add_argument(
            "--agv-model",
            default="R550",
            help="AGV model stored in MySQL, default: R550",
        )
        parser.add_argument(
            "--odom-topic",
            default="/odom",
            help="ROS2 odometry topic, default: /odom",
        )
        parser.add_argument(
            "--voltage-topic",
            default="/PowerVoltage",
            help="ROS2 battery voltage topic, default: /PowerVoltage",
        )
        parser.add_argument(
            "--min-voltage",
            type=float,
            default=22.0,
            help="Voltage treated as 0%% battery, default: 22.0",
        )
        parser.add_argument(
            "--max-voltage",
            type=float,
            default=25.2,
            help="Voltage treated as 100%% battery, default: 25.2",
        )
        parser.add_argument(
            "--running-speed-threshold",
            type=float,
            default=0.05,
            help="Absolute linear speed above this value is treated as running, default: 0.05",
        )

    def handle(self, *args, **options):
        try:
            import rclpy
            from nav_msgs.msg import Odometry
            from std_msgs.msg import Float32
            from rclpy.node import Node
        except ImportError as exc:
            raise CommandError(
                "缺少 ROS2 Python 依赖，请先 source ROS2 环境，并确认已安装 rclpy / nav_msgs / std_msgs。"
            ) from exc

        agv_id = options["agv_id"]
        agv_name = options["agv_name"]
        agv_model = options["agv_model"]
        odom_topic = options["odom_topic"]
        voltage_topic = options["voltage_topic"]
        min_voltage = float(options["min_voltage"])
        max_voltage = float(options["max_voltage"])
        running_speed_threshold = float(options["running_speed_threshold"])

        class AgvCollectorNode(Node):
            def __init__(self):
                super().__init__("agv_collector")
                agv, created = Agv.objects.get_or_create(
                    id=agv_id,
                    defaults={
                        "name": agv_name,
                        "model": agv_model,
                    },
                )
                if not created:
                    updated = False
                    if agv.name != agv_name:
                        agv.name = agv_name
                        updated = True
                    if agv.model != agv_model:
                        agv.model = agv_model
                        updated = True
                    if updated:
                        agv.save(update_fields=["name", "model"])

                self.state = {
                    "agv": agv,
                    "status": "idle",
                    "battery": 0.0,
                    "voltage": 0.0,
                    "position_x": 0.0,
                    "position_y": 0.0,
                    "position_z": 0.0,
                    "orientation": 0.0,
                    "speed": 0.0,
                    "current_task_id": None,
                    "current_task_summary": "",
                }

                self.create_subscription(
                    Odometry,
                    odom_topic,
                    self.handle_odom,
                    10,
                )
                self.create_subscription(
                    Float32,
                    voltage_topic,
                    self.handle_voltage,
                    10,
                )

                self.get_logger().info(
                    f"已订阅 AGV {agv_id}: {odom_topic} (odom), {voltage_topic} (voltage)"
                )
                self.get_logger().info(
                    f"电压换算区间: {min_voltage:.2f}V -> 0%, {max_voltage:.2f}V -> 100%"
                )

            def update_status(self):
                self.state["status"] = "running" if abs(self.state["speed"]) > running_speed_threshold else "idle"

            def persist(self):
                close_old_connections()
                current = self.state
                AgvLatestStatus.objects.update_or_create(
                    agv=current["agv"],
                    defaults={
                        "status": current["status"],
                        "battery": current["battery"],
                        "position_x": current["position_x"],
                        "position_y": current["position_y"],
                        "position_z": current["position_z"],
                        "orientation": current["orientation"],
                        "speed": current["speed"],
                        "current_task_id": current["current_task_id"],
                        "current_task_summary": current["current_task_summary"],
                        "last_update": timezone.now(),
                    },
                )

            def handle_odom(self, msg):
                current = self.state
                current["position_x"] = float(msg.pose.pose.position.x)
                current["position_y"] = float(msg.pose.pose.position.y)
                current["position_z"] = float(msg.pose.pose.position.z)
                current["orientation"] = float(quaternion_to_yaw_degrees(msg.pose.pose.orientation))
                current["speed"] = float(msg.twist.twist.linear.x)
                self.update_status()
                self.persist()

            def handle_voltage(self, msg):
                current = self.state
                current["voltage"] = float(msg.data)
                current["battery"] = voltage_to_battery_percent(current["voltage"], min_voltage, max_voltage)
                self.persist()

        rclpy.init()
        node = AgvCollectorNode()
        self.stdout.write(self.style.SUCCESS("AGV ROS2 采集程序已启动，按 Ctrl+C 停止。"))

        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("AGV ROS2 采集程序已停止。"))
        finally:
            node.destroy_node()
            rclpy.shutdown()
