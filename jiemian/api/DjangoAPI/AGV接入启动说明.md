# AGV 接入启动说明

本文档说明如何将 Wheeltec 小车的 ROS2 实时数据接入当前 Django 后端，并让前端通过 `GET /api/v1/agv` 读取真实数据。

## 1. 当前接入方案

当前版本采集程序不再依赖 `/agv_1/status`、`/agv_1/battery_state` 这类自定义话题，而是直接读取 Wheeltec 小车当前真实存在的话题：

- `/odom`
- `/PowerVoltage`

字段映射如下：

- `/odom`
  - `position_x`
  - `position_y`
  - `position_z`
  - `orientation`
  - `speed`
- `/PowerVoltage`
  - 先读取电压值
  - 再按电压区间换算成 `battery` 百分比

当前状态值的生成逻辑为：

- 当 `abs(speed) > running_speed_threshold` 时，状态记为 `running`
- 否则记为 `idle`

当前版本先不使用：

- `/robot_charging_flag`
- `/robot_red_flag`

后续如果这两个话题确认稳定可用，再补充 `charging` 和 `error` 状态判断。

## 2. 数据流

```text
小车 ROS2 话题
  -> Django 采集命令 run_agv_collector
  -> MySQL 表 agv / agv_latest_status
  -> GET /api/v1/agv
  -> 前端页面轮询读取
```

## 3. 启动前准备

请先确认以下条件成立：

1. 小车和你的电脑在同一个局域网，或至少互相可访问
2. 你的电脑已安装 Python、MySQL、Django 相关依赖
3. 你的电脑已安装 ROS2，或者至少能让 `python manage.py run_agv_collector` 成功导入 `rclpy`
4. 小车端 ROS2 正常运行，并且可以看到 `/odom` 和 `/PowerVoltage`
5. Django 数据库配置已正确填写在 `DjangoAPI/settings.py`

## 4. 第一次启动

### 4.1 在小车上确认话题存在

在小车终端执行：

```bash
ros2 topic list
ros2 topic info /odom
ros2 topic info /PowerVoltage
```

如果需要确认有实时数据：

```bash
ros2 topic echo /odom --once
ros2 topic echo /PowerVoltage --once
```

## 4.2 在电脑上初始化数据库

进入 Django 项目目录：

```bash
cd api/DjangoAPI
```

安装依赖：

```bash
pip install django djangorestframework django-cors-headers pymysql
```

执行迁移：

```bash
python manage.py migrate
```

## 4.3 在电脑上启动 Django 后端

```bash
python manage.py runserver 0.0.0.0:8000
```

启动后可访问：

```text
http://127.0.0.1:8000/api/v1/agv
```

## 4.4 在电脑上启动 ROS2 采集程序

确保当前终端已经加载 ROS2 环境，再执行：

```bash
python manage.py run_agv_collector
```
call D:\Users\dell\Anaconda3\condabin\conda.bat activate C:\Python38
cd /d C:\dev\ros2-humble-20240523\ros2-windows
call setup.bat
cd /d C:\Users\dell\Desktop\23171120232906\jiemian\api\DjangoAPI
python manage.py run_agv_collector

默认参数含义：

- `agv_id = 1`
- `agv_name = AGV-001`
- `agv_model = R550`
- `odom_topic = /odom`
- `voltage_topic = /PowerVoltage`
- `min_voltage = 22.0`
- `max_voltage = 25.2`
- `running_speed_threshold = 0.05`

如果你想显式写出完整命令，可以使用：

```bash
python manage.py run_agv_collector --agv-id 1 --agv-name AGV-001 --agv-model R550 --odom-topic /odom --voltage-topic /PowerVoltage --min-voltage 22.0 --max-voltage 25.2 --running-speed-threshold 0.05
```

## 5. 验证是否采集成功

### 5.1 看后端接口

浏览器打开：

```text
http://127.0.0.1:8000/api/v1/agv
```

如果采集成功，接口应返回类似内容：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "name": "AGV-001",
      "model": "R550",
      "status": "idle",
      "battery": 58.4,
      "position_x": 0.0,
      "position_y": 0.0,
      "position_z": 0.0,
      "orientation": 0.0,
      "speed": 0.0,
      "current_task_id": null,
      "current_task_summary": "",
      "last_update": "2026-03-31T10:00:00Z"
    }
  ]
}
```

### 5.2 看数据库

如果需要，可以在 MySQL 中查看：

```sql
SELECT * FROM agv;
SELECT * FROM agv_latest_status;
```

## 6. 前端联调

当前前端默认还是模拟模式。要使用真实后端数据，需要把 `ui/variables.js` 中的：

```js
SIMULATION_MODE: true
```

改成：

```js
SIMULATION_MODE: false
```

然后启动前端静态服务，例如：

```bash
cd ui
python -m http.server 5500
```

访问：

```text
http://127.0.0.1:5500
```

## 7. 推荐启动顺序

每次联调建议按下面顺序启动：

1. 小车 ROS2 节点先启动
2. 在小车上确认 `/odom` 和 `/PowerVoltage` 正常发布
3. 电脑上启动 MySQL
4. 电脑上启动 Django：`python manage.py runserver 0.0.0.0:8000`
5. 电脑上启动采集程序：`python manage.py run_agv_collector`
6. 打开 `http://127.0.0.1:8000/api/v1/agv` 检查接口返回
7. 前端关闭模拟模式，启动静态服务器并访问页面

## 8. 常见问题

### 8.1 接口返回空数组

通常有以下几种原因：

- 采集程序还没启动
- 采集程序没有收到 ROS2 话题
- Django 没连上 MySQL
- 小车和电脑之间的 ROS2 网络发现没有打通

### 8.2 采集程序启动时报 `rclpy` 导入失败

说明当前电脑终端没有正确加载 ROS2 环境，或者本机没有安装 ROS2 Python 依赖。

### 8.3 电量显示不准

当前 `battery` 是根据 `/PowerVoltage` 做的相对估算值，不是真正的 BMS 精确 SOC。如果后续拿到底盘或电池厂商给出的电压-电量映射表，可以再把换算公式改得更准确。

### 8.4 小车静止时状态一直是 `idle`

这是当前版本的预期行为。因为当前状态判断只依赖 `speed`，静止时就会记为 `idle`。

## 9. 当前版本限制

当前版本已经能支撑第一阶段联调，但还存在这些限制：

- 还没有接入 `charging` 状态
- 还没有接入 `error` 状态
- 还没有接 `GET /api/v1/agv/{id}`
- 还没有实现 WebSocket `agv/status`
- 电量百分比仍是按电压区间估算

## 10. 下一步建议

建议后续按这个顺序继续做：

1. 接入 `/robot_red_flag`，补 `error`
2. 再确认 `/robot_charging_flag` 是否可用，补 `charging`
3. 实现 `GET /api/v1/agv/{id}`
4. 实现 WebSocket `agv/status`
