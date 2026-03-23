# 智能物料搬运系统 – 接口设计规范

## 1. 通用约定

- **Base URL**：`/api/v1`
- **认证**：所有接口（除登录外）需在 Header 携带 `Authorization: Bearer <token>`
- **响应格式**：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

- **错误码**：

| code | 含义 |
|------|------|
| 0 | 成功 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 参数校验失败 |
| 500 | 服务器内部错误 |

- **分页参数**（列表接口通用）：`?page=1&page_size=20`
- **分页响应**：

```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 2. 认证接口

### 2.1 用户登录

```
POST /api/v1/auth/login
```

**Request Body：**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "token": "string",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "username": "operator01",
      "role": "operator"
    }
  }
}
```

---

### 2.2 用户登出

```
POST /api/v1/auth/logout
```

**Response：**
```json
{ "code": 0, "message": "success" }
```

---

### 2.3 获取当前用户信息

```
GET /api/v1/auth/me
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "operator01",
    "role": "operator",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 2.4 刷新 Token

```
POST /api/v1/auth/refresh
```

**Request Header：** 携带当前有效（或即将过期）的 Token

**Response：**
```json
{
  "code": 0,
  "data": {
    "token": "new_token_string",
    "expires_in": 86400
  }
}
```

---

### 2.5 修改密码

```
POST /api/v1/auth/change-password
```

**Request Body：**
```json
{
  "old_password": "string",
  "new_password": "string"
}
```

**Response：**
```json
{ "code": 0, "message": "密码已修改" }
```

---

## 3. AGV 接口

### 3.1 获取所有 AGV 列表

```
GET /api/v1/agv
```

**Query 参数：**
- `status`（可选）：`running` / `idle` / `charging` / `error` / `offline`

**说明（地图三维场景）：** 本接口返回的位姿为**轮询刷新**场景下的快照；与 WebSocket `agv/status` 使用**同一套字段语义**。`position_z` 为地图坐标系高度（地面通常为 `0`）；若后端暂无高度通道，可固定返回 `0`。

**Response：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "AGV-001",
      "model": "R550",
      "status": "running",
      "battery": 85.5,
      "position_x": 12.3,
      "position_y": 45.6,
      "position_z": 0.0,
      "orientation": 90.0,
      "current_task_id": 42,
      "current_task_summary": "A01 → B03",
      "last_update": "2024-01-01T14:32:00Z"
    }
  ]
}
```

---

### 3.2 获取单个 AGV 详情

```
GET /api/v1/agv/{id}
```

**说明：** 供 **AGV 详情页** 与地图场景左键跳转后展示完整档案；位姿字段与列表 / 实时推送一致。`communication_quality` 取值：`strong` / `medium` / `weak` / `disconnected`（与 UI 信号格四档对应）。

**Response：**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "AGV-001",
    "model": "R550",
    "status": "running",
    "battery": 85.5,
    "position_x": 12.3,
    "position_y": 45.6,
    "position_z": 0.0,
    "orientation": 90.0,
    "speed": 0.8,
    "mode": "auto",
    "current_task_id": 42,
    "current_task_summary": "A01 → B03",
    "communication_quality": "strong",
    "last_update": "2024-01-01T14:32:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 3.3 获取 AGV 历史轨迹

```
GET /api/v1/agv/{id}/trajectory
```

**Query 参数：**
- `start_time`：ISO8601 时间字符串
- `end_time`：ISO8601 时间字符串

**Response：**
```json
{
  "code": 0,
  "data": {
    "agv_id": 1,
    "points": [
      { "x": 12.3, "y": 45.6, "z": 0.0, "timestamp": "2024-01-01T14:30:00Z" }
    ]
  }
}
```

> `z` 可选；二维定位源可省略或填 `0`。

---

### 3.4 获取 AGV 当前规划路径

用于地图三维场景中 **PathLayer**：用户右键打开「显示规划路径」后，前端拉取该车的当前规划折线（**按需请求**，避免全量车辆持续占用带宽）。

```
GET /api/v1/agv/{id}/planned-path
```

**说明：**
- 若该车当前无有效规划（空闲、离线或未下发路径），返回 `points` 为空数组，`code` 仍为 `0`。
- 坐标与 `GET /api/v1/map` 中 `scene_3d` 使用**同一世界坐标系**；折线各点高度建议略高于 `ground_z`，由前端在绘制时统一抬升亦可。

**Response：**
```json
{
  "code": 0,
  "data": {
    "agv_id": 1,
    "updated_at": "2024-01-01T14:32:05Z",
    "points": [
      { "x": 12.0, "y": 45.0, "z": 0.0 },
      { "x": 14.5, "y": 46.2, "z": 0.0 }
    ]
  }
}
```

---

## 4. 任务接口

### 4.1 创建任务

```
POST /api/v1/tasks
```

**权限：** operator, admin

**Request Body：**
```json
{
  "type": "transport",
  "start_point": "A01",
  "end_point": "B03",
  "material_type": "电芯",
  "priority": 5,
  "note": "可选备注"
}
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "id": 101,
    "status": "pending",
    "created_at": "2024-01-01T14:32:00Z"
  }
}
```

---

### 4.2 获取任务列表

```
GET /api/v1/tasks
```

**Query 参数：**
- `status`（可选）：pending/running/completed/failed/cancelled
- `agv_id`（可选）
- `material_type`（可选）
- `start_time`（可选）
- `end_time`（可选）
- `page`、`page_size`

**Response：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 101,
        "agv_id": 1,
        "type": "transport",
        "start_point": "A01",
        "end_point": "B03",
        "material_type": "电芯",
        "priority": 5,
        "status": "completed",
        "created_at": "2024-01-01T14:00:00Z",
        "start_time": "2024-01-01T14:05:00Z",
        "end_time": "2024-01-01T14:12:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 4.3 获取任务详情

```
GET /api/v1/tasks/{id}
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "id": 101,
    "agv_id": 1,
    "type": "transport",
    "start_point": "A01",
    "end_point": "B03",
    "material_type": "电芯",
    "priority": 5,
    "status": "completed",
    "created_at": "2024-01-01T14:00:00Z",
    "start_time": "2024-01-01T14:05:00Z",
    "end_time": "2024-01-01T14:12:00Z",
    "result": { "inspections_passed": 3, "inspections_failed": 0 }
  }
}
```

---

### 4.4 取消任务

```
POST /api/v1/tasks/{id}/cancel
```

**权限：** operator, admin

**Response：**
```json
{ "code": 0, "message": "任务已取消" }
```

---

### 4.5 调整任务优先级

```
PATCH /api/v1/tasks/{id}/priority
```

**权限：** operator, admin

**Request Body：**
```json
{ "priority": 8 }
```

**Response：**
```json
{ "code": 0, "message": "优先级已更新" }
```

---

## 5. 物料检测接口

### 5.1 获取检测记录列表

```
GET /api/v1/inspections
```

**Query 参数：**
- `task_id`（可选）
- `material_type`（可选）：物料类型筛选
- `surface_defect`（可选）：true/false
- `start_time`、`end_time`（可选）
- `page`、`page_size`

**Response：** 分页列表，每项包含：

```json
{
  "id": 1,
  "task_id": 101,
  "image_url": "/static/inspections/img_001.jpg",
  "color": "红色",
  "weight": 245.3,
  "surface_defect": true,
  "defect_type": "划伤",
  "confidence": 0.942,
  "inspected_at": "2024-01-01T14:08:00Z"
}
```

---

### 5.2 获取单条检测详情

```
GET /api/v1/inspections/{id}
```

**Response：** 同上，单条完整数据

---

## 6. 事件日志接口

### 6.1 获取事件列表

```
GET /api/v1/events
```

**Query 参数：**
- `type`（可选）：error/warning/info
- `agv_id`（可选）
- `handled`（可选）：true/false
- `start_time`、`end_time`（可选）
- `page`、`page_size`

**Response：** 分页列表，每项包含：

```json
{
  "id": 1,
  "agv_id": 1,
  "type": "error",
  "code": "BAT_LOW",
  "message": "AGV-001 电量低于 20%，请及时充电",
  "handled": false,
  "created_at": "2024-01-01T14:20:00Z"
}
```

---

### 6.2 标记事件已处理

```
POST /api/v1/events/{id}/handle
```

**权限：** operator, admin

**Response：**
```json
{ "code": 0, "message": "已标记为处理" }
```

---

## 7. 用户管理接口（admin 权限）

### 7.1 获取用户列表

```
GET /api/v1/users
```

**Response：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 7.2 创建用户

```
POST /api/v1/users
```

**Request Body：**
```json
{
  "username": "string",
  "password": "string",
  "role": "operator"
}
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "id": 2,
    "username": "operator01",
    "role": "operator",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

---

### 7.3 修改用户角色

```
PATCH /api/v1/users/{id}/role
```

**Request Body：**
```json
{ "role": "admin" }
```

**Response：**
```json
{ "code": 0, "message": "角色已更新" }
```

---

### 7.4 删除用户

```
DELETE /api/v1/users/{id}
```

**Response：**
```json
{ "code": 0, "message": "用户已删除" }
```

---

## 8. 仪表盘统计接口

### 8.1 获取总览统计数据

```
GET /api/v1/dashboard/summary
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "agv_online": 5,
    "agv_total": 5,
    "tasks_today": 128,
    "tasks_running": 3,
    "events_unhandled": 2,
    "avg_battery": 78.2,
    "total_mileage_km": 1024.5
  }
}
```

---

### 8.2 获取任务趋势数据

```
GET /api/v1/dashboard/task-trend
```

**Query 参数：**
- `days`：天数（默认 7）

**Response：**
```json
{
  "code": 0,
  "data": [
    { "date": "2024-01-01", "completed": 120, "failed": 3 }
  ]
}
```

---

### 8.3 获取能耗统计数据

```
GET /api/v1/dashboard/energy
```

**Query 参数：**
- `days`：天数（默认 7）

**Response：**
```json
{
  "code": 0,
  "data": [
    { "date": "2024-01-01", "energy_kwh": 12.5, "mileage_km": 156.3 }
  ]
}
```

---

### 8.4 获取 AGV 状态分布

```
GET /api/v1/dashboard/agv-distribution
```

**Response：**
```json
{
  "code": 0,
  "data": [
    { "status": "running", "count": 3 },
    { "status": "idle", "count": 1 },
    { "status": "charging", "count": 1 },
    { "status": "offline", "count": 0 },
    { "status": "error", "count": 0 }
  ]
}
```

---

## 9. 基础数据接口

### 9.1 获取工位列表

```
GET /api/v1/stations
```

**Response：**
```json
{
  "code": 0,
  "data": [
    {
      "id": "A01",
      "name": "A01 电芯上料工位",
      "x": 10.5,
      "y": 20.3,
      "type": "loading"
    }
  ]
}
```

---

### 9.2 获取地图数据

```
GET /api/v1/map
```

**说明：** 在保留二维底图字段（供创建任务页工位预览、详情页小地图等复用）的同时，增加 **`scene_3d`**，用于地图监控页初始化三维场景范围与可选自定义载体模型。

**Response：**
```json
{
  "code": 0,
  "data": {
    "image_url": "/static/map/floor_plan.png",
    "width": 800,
    "height": 600,
    "resolution": 0.05,
    "origin_x": 0.0,
    "origin_y": 0.0,
    "scene_3d": {
      "coordinate_frame": "map",
      "origin_z": 0.0,
      "bounds": {
        "min_x": 0.0,
        "max_x": 100.0,
        "min_y": 0.0,
        "max_y": 80.0
      },
      "ground_z": 0.0,
      "plate_thickness": 0.05,
      "custom_model_url": null,
      "custom_model_asset_id": null
    }
  }
}
```

**字段说明（`scene_3d`）：**
- `bounds`：建议在三维场景中用于初始相机范围与「适合全部 AGV」的包围参考。
- `ground_z`：地图载体上表面高度基准；AGV 与路径点高度可相对该值解释。
- `plate_thickness`：默认平板厚度的**建议值**（米或地图单位，与 `resolution` 一致即可），前端用简单几何时参考。
- `custom_model_url` / `custom_model_asset_id`：二选一或皆空；非空时表示地图载体使用自定义模型资源，**替换**默认扁平板几何。

---

### 9.3 获取物料类型列表

```
GET /api/v1/material-types
```

**Response：**
```json
{
  "code": 0,
  "data": [
    { "key": "cell", "label": "电芯" },
    { "key": "bms", "label": "BMS板" },
    { "key": "housing", "label": "壳体" },
    { "key": "connector", "label": "连接器" }
  ]
}
```

---

## 10. 自然语言交互接口

### 10.1 发送自然语言指令

```
POST /api/v1/nlp/command
```

**Request Body：**
```json
{
  "text": "去A工位取红色物料送到B工位",
  "input_type": "text"
}
```

**Response：**
```json
{
  "code": 0,
  "data": {
    "parsed": {
      "action": "transport",
      "start_point": "A01",
      "end_point": "B03",
      "material_type": "红色物料"
    },
    "task_id": 102,
    "reply": "已解析指令并创建任务 #102，分配给 AGV-001 执行。"
  }
}
```

---

### 10.2 获取对话历史

```
GET /api/v1/nlp/history
```

**Query 参数：**
- `page`、`page_size`

**Response：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "role": "user",
        "content": "去A工位取红色物料送到B工位",
        "created_at": "2024-01-01T14:30:00Z"
      },
      {
        "id": 2,
        "role": "system",
        "content": "已解析指令并创建任务 #102，分配给 AGV-001 执行。",
        "task_id": 102,
        "created_at": "2024-01-01T14:30:01Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 11. 审计日志接口

### 11.1 获取用户操作日志

```
GET /api/v1/audit-logs
```

**权限：** admin

**Query 参数：**
- `user_id`（可选）
- `action`（可选）：`login` / `logout` / `create_task` / `cancel_task` / `update_config` 等
- `start_time`、`end_time`（可选）
- `page`、`page_size`

**Response：**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": 1,
        "username": "operator01",
        "action": "create_task",
        "target": "task:101",
        "ip": "192.168.1.100",
        "detail": "创建搬运任务，起点A01→终点B03",
        "created_at": "2024-01-01T14:00:00Z"
      }
    ],
    "total": 500,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 12. WebSocket 接口

**连接地址：** `ws://<host>/ws?token=<token>`

连接建立后，客户端通过发送订阅消息来选择接收的数据频道。

### 12.1 订阅协议

**客户端订阅消息格式：**
```json
{
  "action": "subscribe",
  "topic": "agv/status"
}
```

**客户端取消订阅：**
```json
{
  "action": "unsubscribe",
  "topic": "agv/status"
}
```

**心跳保活：**
- 客户端每 30 秒发送：`{ "action": "ping" }`
- 服务端回复：`{ "action": "pong" }`
- 若 60 秒内未收到 pong，客户端视为连接断开

**断连重连策略：**
- 连接断开后自动重连，采用指数退避：1s → 2s → 4s → 8s → 最大 30s
- 重连成功后自动恢复之前的所有订阅
- 重连期间 UI 顶部显示"连接断开，正在重连..."提示

---

### 12.2 Topic：agv/status

**用途：** 地图三维场景 **多车实时位姿与状态** 的推荐数据源；载荷与 `GET /api/v1/agv` 列表项保持字段对齐，便于前端共用解析逻辑。

**推送频率：** 默认每秒一次；若后端支持**变化推送**，可在位姿或状态变化时立即推送（仍建议合并为数组，避免单连接消息风暴）。

**服务端推送格式：**
```json
{
  "topic": "agv/status",
  "data": [
    {
      "id": 1,
      "name": "AGV-001",
      "status": "running",
      "battery": 85.5,
      "position_x": 12.3,
      "position_y": 45.6,
      "position_z": 0.0,
      "orientation": 90.0,
      "speed": 0.8,
      "current_task_id": 42,
      "current_task_summary": "A01 → B03",
      "timestamp": "2024-01-01T14:32:00.123Z"
    }
  ]
}
```

**轮询备选：** 若 WebSocket 不可用，前端可对 `GET /api/v1/agv` 进行定时轮询（例如 1s–2s，按部署性能调整），用返回数组更新场景中各 **AGVEntity**。

---

### 12.3 Topic：task/updates

**触发时机：** 任务状态发生变化时推送

**服务端推送格式：**
```json
{
  "topic": "task/updates",
  "data": {
    "id": 101,
    "status": "completed",
    "agv_id": 1,
    "updated_at": "2024-01-01T14:12:00Z"
  }
}
```

---

### 12.4 Topic：inspection

**触发时机：** 新的物料检测结果产生时推送

**服务端推送格式：**
```json
{
  "topic": "inspection",
  "data": {
    "id": 55,
    "task_id": 101,
    "image_url": "/static/inspections/img_055.jpg",
    "color": "红色",
    "weight": 245.3,
    "surface_defect": false,
    "confidence": 0.97,
    "inspected_at": "2024-01-01T14:08:00Z"
  }
}
```

---

### 12.5 Topic：events

**触发时机：** 新事件/日志产生时推送

**服务端推送格式：**
```json
{
  "topic": "events",
  "data": {
    "id": 88,
    "type": "warning",
    "code": "BAT_LOW",
    "agv_id": 2,
    "message": "AGV-002 电量低于 20%",
    "created_at": "2024-01-01T14:20:00Z"
  }
}
```

---

## 13. 后端与 AGV/ROS 通信接口（内部）

> 以下为后端服务与 ROS Bridge 之间的内部通信设计，不对前端暴露。

### 13.1 订阅 ROS Topics（后端消费）

| Topic | 消息类型 | 说明 |
|-------|----------|------|
| `/agv_{id}/odom` | nav_msgs/Odometry | 里程计（位置、速度） |
| `/agv_{id}/amcl_pose` | geometry_msgs/PoseWithCovarianceStamped | AMCL 定位结果 |
| `/agv_{id}/battery_state` | sensor_msgs/BatteryState | 电量信息 |
| `/agv_{id}/status` | 自定义 | AGV 运行模式、状态 |
| `/inspection/result` | 自定义 | OpenClaw 物料检测结果 |
| `/openclaw/command` | std_msgs/String | OpenClaw 输出的高层指令（JSON） |

### 13.2 发布 ROS Topics（后端发布）

| Topic | 消息类型 | 说明 |
|-------|----------|------|
| `/agv_{id}/move_base_simple/goal` | geometry_msgs/PoseStamped | 导航目标点 |
| `/agv_{id}/cancel_goal` | actionlib_msgs/GoalID | 取消当前导航 |
| `/openclaw/agv_state` | std_msgs/String | 向 OpenClaw 推送 AGV 状态（JSON） |

### 13.3 调用 ROS Services（后端调用）

| Service | 类型 | 说明 |
|---------|------|------|
| `/agv_{id}/gripper_control` | 自定义 | 控制机械臂抓取/释放 |
| `/agv_{id}/set_mode` | 自定义 | 切换自动/手动模式 |

---

## 14. 权限矩阵

| 接口 | viewer | operator | admin |
|------|--------|----------|-------|
| GET /agv | ✓ | ✓ | ✓ |
| GET /tasks | ✓ | ✓ | ✓ |
| POST /tasks | ✗ | ✓ | ✓ |
| POST /tasks/{id}/cancel | ✗ | ✓ | ✓ |
| PATCH /tasks/{id}/priority | ✗ | ✓ | ✓ |
| GET /inspections | ✓ | ✓ | ✓ |
| GET /events | ✓ | ✓ | ✓ |
| POST /events/{id}/handle | ✗ | ✓ | ✓ |
| GET /stations | ✓ | ✓ | ✓ |
| GET /map | ✓ | ✓ | ✓ |
| GET /agv/{id}/planned-path | ✓ | ✓ | ✓ |
| GET /material-types | ✓ | ✓ | ✓ |
| GET /dashboard/* | ✓ | ✓ | ✓ |
| POST /nlp/command | ✗ | ✓ | ✓ |
| GET /nlp/history | ✗ | ✓ | ✓ |
| POST /auth/change-password | ✓ | ✓ | ✓ |
| GET /audit-logs | ✗ | ✗ | ✓ |
| GET /users | ✗ | ✗ | ✓ |
| POST /users | ✗ | ✗ | ✓ |
| PATCH /users/{id}/role | ✗ | ✗ | ✓ |
| DELETE /users/{id} | ✗ | ✗ | ✓ |
