# 前台哪些数据需要从 AGV 读取

## 1. 整理依据

本文只根据以下现有资料整理，不补写未定义接口：

- `ui/api-spec/api.md`
- `ui/ui-spec/ui.md`
- 当前前端代码：`ui/map.js`、`ui/agv.js`

这里把内容分成两层：

- `当前前端代码已实际接入的 AGV 数据`
- `接口规范已定义、前台页面会用到，但当前代码还没接上的 AGV 数据`

---

## 2. 先说结论

前台真正需要从 AGV 小车或车载模块读取的核心数据，按现有文档可以确定是这几类：

1. `AGV 实时状态`：位置、朝向、速度、电量、运行状态、当前任务摘要
2. `AGV 详情状态`：模式、通信质量、最后更新时间等单车详情
3. `规划路径`：当前规划折线路径点
4. `历史轨迹`：轨迹点和时间戳
5. `车载检测结果`：图片、颜色、重量、表面缺陷、置信度

最关键的前端接口是：

- `GET /api/v1/agv`
- `GET /api/v1/agv/{id}`
- `GET /api/v1/agv/{id}/planned-path`
- `GET /api/v1/agv/{id}/trajectory`
- WebSocket `agv/status`
- `GET /api/v1/inspections`
- `GET /api/v1/inspections/{id}`
- WebSocket `inspection`

---

## 3. 当前前端代码已实际接入的 AGV 数据

### 3.1 地图监控页：多车实时位置与状态

页面依据：

- `ui/ui-spec/ui.md` 说明地图监控页通过 WebSocket 推送或 REST 轮询刷新多车状态
- `ui/map.js` 当前已实际调用：
  - `GET /api/v1/agv`
  - WebSocket 订阅 `agv/status`

前台需要的数据：

- `id`
- `name`
- `model`
- `status`
- `battery`
- `position_x`
- `position_y`
- `position_z`
- `orientation`
- `speed`
- `current_task_id`
- `current_task_summary`
- `last_update` 或 WebSocket 中的 `timestamp`

对应接口：

```text
GET /api/v1/agv
WebSocket topic: agv/status
```

接口出处说明：

- `GET /api/v1/agv` 在接口规范中明确写了这是地图三维场景轮询快照
- WebSocket `agv/status` 在接口规范中明确写了用途是“地图三维场景多车实时位姿与状态”

后端内部已明确的数据来源：

- `/agv_{id}/odom`
- `/agv_{id}/amcl_pose`
- `/agv_{id}/battery_state`
- `/agv_{id}/status`

### 3.2 地图监控页：单车规划路径

页面依据：

- `ui/ui-spec/ui.md` 说明右键点击小车切换规划路径显示
- `ui/map.js` 当前已实际调用 `GET /api/v1/agv/{id}/planned-path`

前台需要的数据：

- `agv_id`
- `updated_at`
- `points[].x`
- `points[].y`
- `points[].z`

对应接口：

```text
GET /api/v1/agv/{id}/planned-path
```

说明：

- 这个接口在规范中已经明确定义
- 规范只定义了前端接口和返回结构
- 文档没有明确写这个接口在 ROS 内部对应哪个 topic 或 service，所以这里不补写内部来源

### 3.3 AGV 详情页：单车实时详情

页面依据：

- `ui/ui-spec/ui.md` 说明 AGV 详情页有“基本信息卡”和“实时状态卡”
- `ui/agv.js` 当前已实际调用：
  - `GET /api/v1/agv`
  - `GET /api/v1/agv/{id}`

前台需要的数据：

- `id`
- `name`
- `model`
- `status`
- `battery`
- `position_x`
- `position_y`
- `position_z`
- `orientation`
- `speed`
- `mode`
- `current_task_id`
- `current_task_summary`
- `communication_quality`
- `last_update`
- `created_at`

对应接口：

```text
GET /api/v1/agv/{id}
```

后端内部已明确的数据来源：

- `/agv_{id}/odom`
- `/agv_{id}/amcl_pose`
- `/agv_{id}/battery_state`
- `/agv_{id}/status`

说明：

- `communication_quality` 的前端字段和值域在接口规范里已写明
- 但它在 ROS 内部具体来自哪个通道，文档没有单独说明，因此不展开补写

---

## 4. 规范已定义、前台页面会用到，但当前代码还没接上的 AGV 数据

### 4.1 AGV 详情页：历史轨迹回放

页面依据：

- `ui/ui-spec/ui.md` 说明 AGV 详情页包含“历史轨迹回放（小地图 + 时间轴）”
- `ui/agv.js` 当前代码里还没有实际发起这个请求
- 但接口规范已经定义

前台需要的数据：

- `agv_id`
- `points[].x`
- `points[].y`
- `points[].z`
- `points[].timestamp`

对应接口：

```text
GET /api/v1/agv/{id}/trajectory
```

说明：

- 接口规范已明确定义返回结构
- 文档没有把这个接口单独映射到某个 ROS topic
- 只能确认它属于 AGV 定位/轨迹相关数据

### 4.2 物料检测页：车载检测结果

页面依据：

- `ui/ui-spec/ui.md` 说明物料检测页展示实时检测图像和检测详情
- 当前前端代码里还没有实际请求这一页的数据
- 接口规范已经定义 REST 和 WebSocket

前台需要的数据：

- `id`
- `task_id`
- `image_url`
- `color`
- `weight`
- `surface_defect`
- `defect_type`
- `confidence`
- `inspected_at`

对应接口：

```text
GET /api/v1/inspections
GET /api/v1/inspections/{id}
WebSocket topic: inspection
```

后端内部已明确的数据来源：

- `/inspection/result`

说明：

- 接口规范明确把 `/inspection/result` 定义为后端消费的内部 topic
- 如果这个检测模块部署在 AGV 车上，那么这部分可以算“从 AGV 车载模块读取”
- 这里只按文档写“车载检测结果接口已定义”，不扩展未定义细节

---

## 5. 与 AGV 有关，但不建议算作“前台直接从小车读取”的接口

下面这些接口和 AGV 有关联，但前端拿到的已经是后端聚合、存储或事件化后的结果，不是直接读取小车实时原始数据：

### 5.1 事件日志

接口：

```text
GET /api/v1/events
WebSocket topic: events
```

前台字段：

- `id`
- `agv_id`
- `type`
- `code`
- `message`
- `handled`
- `created_at`

说明：

- 这些事件可能来自 AGV 异常
- 但接口规范没有把 `events` 直接映射到某个车端 topic
- 所以只能写“与 AGV 相关”，不能写成“直接从 AGV 读取”

### 5.2 Dashboard 统计

接口：

```text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/energy
GET /api/v1/dashboard/agv-distribution
```

说明：

- 这些统计值里有 AGV 相关内容，例如在线数、平均电量、里程、状态分布
- 但前端看到的是后端统计结果，不是车端实时原始数据

### 5.3 任务状态推送

接口：

```text
WebSocket topic: task/updates
```

说明：

- 任务状态变化可能受 AGV 执行反馈影响
- 但它本身是任务状态接口，不是 AGV 原始数据接口

---

## 6. 可以直接给后端的最小对接清单

如果只整理“前台接真车必须优先打通什么”，按当前项目资料，优先级如下：

1. WebSocket `agv/status`
2. `GET /api/v1/agv`
3. `GET /api/v1/agv/{id}`
4. `GET /api/v1/agv/{id}/planned-path`
5. `GET /api/v1/agv/{id}/trajectory`
6. `GET /api/v1/inspections`
7. `GET /api/v1/inspections/{id}`
8. WebSocket `inspection`

---

## 7. 一句话版结论

按你现在的文档和前端代码，前台真正需要从 AGV 读取的主要是：

- `实时状态`：位置、朝向、速度、电量、状态、当前任务
- `详情状态`：模式、通信质量、最后更新时间
- `路径轨迹`：规划路径、历史轨迹
- `车载检测`：检测图片和检测结果

其中最核心的数据通道是 `agv/status`，最核心的 REST 兜底接口是 `GET /api/v1/agv` 和 `GET /api/v1/agv/{id}`。
