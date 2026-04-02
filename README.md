# 智能物料搬运系统

一个面向 AGV 场景的智能物料搬运系统原型项目，包含前端监控界面、三维地图展示、AGV 详情页交互，以及一个基于 Django 的后端工程。当前仓库已经具备“前端原型演示 + 第一阶段 AGV 状态监控后端”的基础能力，既可以脱离真实设备演示，也可以接入 Wheeltec 小车的 ROS2 话题读取实时状态。

## 项目亮点

- 深色液态玻璃风格监控界面
- 基于 Vue 3 的单页前端原型
- 基于 Three.js 的三维地图监控页面
- AGV 详情页与 3D 模型交互展示
- 前端支持模拟模式与真实后端模式切换
- Django 后端已提供 AGV 状态列表接口
- 支持通过 `run_agv_collector` 采集 ROS2 话题并写入 MySQL
- 附带 UI、接口、需求和 AGV 接入说明文档

## 当前状态

这个仓库目前不是单纯的界面原型，而是一个“前端原型 + 第一阶段 AGV 状态监控后端”的组合项目：

- `ui/` 已实现监控界面、地图页面和 AGV 详情页原型
- 前端默认开启模拟模式，没有真实设备也可以直接展示
- `api/DjangoAPI/` 已提供 AGV 状态列表接口 `GET /api/v1/agv`
- 后端已包含 AGV 基础数据表与实时状态表：`agv`、`agv_latest_status`
- 已提供 ROS2 采集命令 `python manage.py run_agv_collector`
- 仍保留 `department`、`employee` 等基础 CRUD 示例接口，便于学习 Django/DRF 基本结构

当前阶段更适合的定位是：

- 课程设计 / 毕设演示
- AGV 状态监控原型联调
- 前后端分离项目的初始框架
- 后续接入 SLAM、导航、任务调度前的第一阶段基础版本

## 功能概览

### 前端功能

- 监控总览 Dashboard
- 三维地图监控页面
- AGV 管理 / AGV 详情页
- 实时连接状态提示
- 路径展示、视角控制、悬浮信息卡
- AGV 部件高亮与浮动信息卡片
- 模拟数据演示模式

### 后端功能

- Django 5 项目结构
- Django REST Framework
- MySQL 数据库连接
- 跨域配置已开启
- AGV 状态数据模型
- `GET /api/v1/agv` AGV 状态列表接口
- `status` 查询参数过滤
- ROS2 -> Django -> MySQL 数据采集链路
- 部门与员工示例 CRUD 接口

### 文档

- UI 设计规范：`ui/ui-spec/ui.md`
- 接口设计规范：`ui/api-spec/api.md`
- 前后端与数据库需求说明：`ui/requirement.md`
- AGV 接入启动说明：`api/DjangoAPI/AGV接入启动说明.md`
- 后端开发清单：`后端开发清单.md`

## 技术栈

### 前端技术

- HTML / CSS / JavaScript
- Vue 3
- Vue Router 4
- ECharts 5
- Three.js

前端依赖通过 CDN 引入，不需要单独执行 `npm install`。

### 后端技术

- Python
- Django
- Django REST Framework
- django-cors-headers
- PyMySQL
- MySQL
- ROS2 Python 客户端 `rclpy`（真实设备接入时需要）

## 目录结构

```text
jiemian/
├─ ui/
│  ├─ index.html                                 # 前端入口
│  ├─ app.js                                     # 路由与应用挂载
│  ├─ home.js                                    # 首页/总览
│  ├─ map.js                                     # 三维地图监控
│  ├─ agv.js                                     # AGV 详情页
│  ├─ variables.js                               # 前端配置项
│  ├─ AGVCARglb.glb                              # AGV 3D 模型
│  ├─ ui-spec/ui.md                              # UI 设计文档
│  ├─ api-spec/api.md                            # 接口设计文档
│  └─ requirement.md                             # 需求说明
├─ api/
│  └─ DjangoAPI/
│     ├─ manage.py                               # Django 启动入口
│     ├─ AGV接入启动说明.md                       # ROS2 接入说明
│     ├─ DjangoAPI/                              # 项目配置
│     └─ EmployeeApp/
│        ├─ models.py                            # 部门/员工/AGV 数据模型
│        ├─ views.py                             # 接口视图
│        ├─ urls.py                              # 应用路由
│        └─ management/commands/run_agv_collector.py
│                                               # AGV 实时采集命令
├─ 后端开发清单.md
└─ README.md
```

## 快速开始

### 1. 仅演示前端原型

如果你当前只是展示页面，不需要启动 Django，也不需要连接真实 AGV。

前端默认使用模拟模式，`ui/variables.js` 中建议保持：

```js
SIMULATION_MODE: true
```

启动方式：

```bash
cd ui
python -m http.server 5500
```

浏览器访问：

`http://127.0.0.1:5500`

### 2. 启动 Django 后端

先确保本机已安装 Python 和 MySQL，并根据本地环境修改 `api/DjangoAPI/DjangoAPI/settings.py` 中的数据库配置。

安装依赖：

```bash
cd api/DjangoAPI
pip install django djangorestframework django-cors-headers pymysql
```

初始化数据库并启动：

```bash
cd api/DjangoAPI
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

接口默认访问地址：

`http://127.0.0.1:8000/api/v1/agv`

### 3. 接入真实 AGV 数据

如果你要接入 Wheeltec 小车的真实 ROS2 数据，需要额外满足以下条件：

1. 小车和电脑网络互通
2. 小车端 ROS2 正常运行
3. 电脑端可以正常导入 `rclpy`
4. 小车能发布 `/odom` 和 `/PowerVoltage`

启动采集程序前，请先加载 ROS2 环境，再执行：

```bash
cd api/DjangoAPI
python manage.py run_agv_collector
```

默认采集逻辑：

- 读取 `/odom`
- 读取 `/PowerVoltage`
- 根据速度判断 `running` / `idle`
- 根据电压区间换算 `battery`
- 将实时结果写入 `agv` 和 `agv_latest_status`

更完整的接入步骤请查看：

`api/DjangoAPI/AGV接入启动说明.md`

### 4. 前端联调真实后端

当后端接口与采集程序都已正常运行时，把 `ui/variables.js` 中的：

```js
SIMULATION_MODE: true
```

改成：

```js
SIMULATION_MODE: false
```

然后重新启动前端静态服务：

```bash
cd ui
python -m http.server 5500
```

## 现有接口

### AGV 接口

- `GET /api/v1/agv`
- `GET /api/v1/agv?status=running`
- `GET /api/v1/agv?status=idle`
- `GET /api/v1/agv?status=charging`
- `GET /api/v1/agv?status=error`
- `GET /api/v1/agv?status=offline`

当前返回字段包含：

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
- `last_update`

示例响应：

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

### 示例 CRUD 接口

- `GET /department`
- `POST /department`
- `PUT /department`
- `DELETE /department/<id>`
- `GET /employee`
- `POST /employee`
- `PUT /employee`
- `DELETE /employee/<id>`
- `POST /employee/savefile`

## 推荐启动顺序

如果要做真实设备联调，建议按下面顺序启动：

1. 小车端 ROS2 节点启动
2. 在小车上确认 `/odom` 和 `/PowerVoltage` 正常发布
3. 电脑上启动 MySQL
4. 电脑上启动 Django：`python manage.py runserver 0.0.0.0:8000`
5. 电脑上启动采集程序：`python manage.py run_agv_collector`
6. 打开 `http://127.0.0.1:8000/api/v1/agv` 验证接口返回
7. 前端关闭模拟模式并启动静态服务

## 适用场景

- 智能制造 / 智能物流课程设计
- AGV 状态监控系统原型展示
- 三维工业大屏界面演示
- 前后端分离项目二次开发
- 毕设或答辩展示素材

## 当前限制

- 当前完成度仍然是前端高于后端
- 已实现的是第一阶段“AGV 状态监控”能力，不是完整调度系统
- 目前重点是 `GET /api/v1/agv`，`GET /api/v1/agv/{id}` 还未完成
- WebSocket 实时推送能力尚未接入
- 地图、路径、轨迹等能力仍需等待后续 SLAM / 导航模块
- `settings.py` 中可能仍有开发阶段配置，公开前请自行检查敏感信息

## 后续建议

- 增加 `requirements.txt`
- 增加项目截图或演示 GIF
- 补齐 `GET /api/v1/agv/{id}` 等接口
- 增加 WebSocket 实时状态推送
- 将数据库配置和密钥改为环境变量
- 增加部署说明与测试说明

## License

当前仓库未声明许可证。如需开源到 GitHub，建议补充 `LICENSE` 文件，例如 MIT License。
