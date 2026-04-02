# 智能物料搬运系统

一个面向 AGV 场景的智能物料搬运系统原型项目，包含前端监控界面、三维地图展示、AGV 详情页交互，以及一个基于 Django 的后端示例工程。项目当前适合作为课程设计、毕设演示、界面原型展示或后续二次开发基础。

## 项目亮点

- 深色液态玻璃风格监控界面
- 基于 Vue 3 的单页前端原型
- 基于 Three.js 的三维地图监控页面
- AGV 3D 模型查看与部件信息交互
- 提供接口设计文档与 UI 设计文档
- 内置模拟模式，前端可脱离真实设备演示

## 当前状态

这个仓库目前是一个“前端原型 + 后端示例”的组合项目：

- `ui/` 目录已经实现了监控界面、地图页面和 AGV 详情页面原型
- `ui/ui-spec/ui.md` 和 `ui/api-spec/api.md` 提供了较完整的 UI 与接口设计规范
- `api/DjangoAPI/` 是 Django 后端示例工程，目前主要包含 `department`、`employee` 等基础 CRUD 接口
- 前端默认开启模拟模式，因此即使没有完整 AGV 后端，也可以直接演示页面效果

如果你准备把仓库传到 GitHub，这个 README 会比较适合作为项目主页说明；如果后续你想把它打造成可直接部署的完整系统，还可以继续补 `requirements.txt`、接口实现、数据库初始化脚本和截图说明。

## 功能概览

### 前端原型

- 监控总览 Dashboard
- 三维地图监控页面
- AGV 管理 / AGV 详情页
- 实时连接状态提示
- 路径展示、视角控制、悬浮信息卡
- AGV 部件高亮与浮动信息卡片

### 文档设计

- UI 设计规范：`ui/ui-spec/ui.md`
- 接口设计规范：`ui/api-spec/api.md`
- 前后端与数据库需求说明：`ui/requirement.md`

### 后端示例

- Django 5 项目结构
- Django REST Framework
- MySQL 数据库连接
- 跨域配置已开启
- 员工与部门示例接口

## 技术栈

### 前端

- HTML / CSS / JavaScript
- Vue 3
- Vue Router 4
- ECharts 5
- Three.js

前端依赖通过 CDN 引入，不需要单独执行 `npm install`。

### 后端

- Python
- Django
- Django REST Framework
- django-cors-headers
- PyMySQL
- MySQL

## 目录结构

```text
jiemian/
├─ ui/
│  ├─ index.html              # 前端入口
│  ├─ app.js                  # 路由与应用挂载
│  ├─ home.js                 # 首页/总览
│  ├─ map.js                  # 三维地图监控
│  ├─ agv.js                  # AGV 详情页
│  ├─ variables.js            # 前端配置项
│  ├─ AGVCARglb.glb           # AGV 3D 模型
│  ├─ ui-spec/ui.md           # UI 设计文档
│  ├─ api-spec/api.md         # 接口设计文档
│  └─ requirement.md          # 需求说明
├─ api/
│  └─ DjangoAPI/
│     ├─ manage.py            # Django 启动入口
│     ├─ DjangoAPI/           # 项目配置
│     └─ EmployeeApp/         # 示例应用
└─ README.md
```

## 快速开始

### 1. 运行前端原型

前端默认使用模拟数据模式，适合直接演示。

1. 进入 `ui` 目录
2. 启动一个本地静态服务器
3. 在浏览器中打开页面

示例：

```bash
cd ui
python -m http.server 5500
```

然后访问：

`http://127.0.0.1:5500`

### 前端配置说明

配置文件：`ui/variables.js`

- `API_URL`：后端接口地址
- `WS_URL`：WebSocket 地址
- `PHOTO_URL`：静态资源地址
- `SIMULATION_MODE`：是否启用模拟模式，默认 `true`
- `AGVCAR_MODEL_URL`：AGV 模型路径

如果只是展示页面，建议保持：

```js
SIMULATION_MODE: true
```

这样即使后端未实现完整 AGV 接口，地图和 AGV 页面也能以模拟数据运行。

### 2. 运行 Django 后端示例

先确保本机已经安装 Python 和 MySQL。

### 安装依赖

```bash
cd api/DjangoAPI
pip install django djangorestframework django-cors-headers pymysql
```

### 配置数据库

当前数据库配置写在 `api/DjangoAPI/DjangoAPI/settings.py` 中，默认使用 MySQL。你需要根据自己的环境修改数据库名、用户名和密码。

### 执行迁移并启动

```bash
cd api/DjangoAPI
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

默认启动后访问：

`http://localhost:8080/index.html#/`

## 已有接口

当前 Django 示例工程中已包含以下接口：

- `GET /department`
- `POST /department`
- `PUT /department`
- `DELETE /department/<id>`
- `GET /employee`
- `POST /employee`
- `PUT /employee`
- `DELETE /employee/<id>`
- `POST /employee/savefile`

注意：

- 这些接口是示例 CRUD 接口
- 前端 AGV 页面所需的完整业务接口，以 `ui/api-spec/api.md` 为设计目标
- 如果要真正联调 AGV 页面，需要按接口文档继续补全后端实现

## 适用场景

- 智能制造/智能物流课程设计
- AGV 监控系统原型展示
- 三维工业大屏界面演示
- 前后端分离项目二次开发
- 毕设或答辩展示素材

## 后续建议

如果你准备继续完善这个仓库，建议优先补充以下内容：

- 增加 `requirements.txt`
- 增加项目截图或演示 GIF
- 补齐 `api/v1` 下的 AGV、任务、日志等接口
- 将数据库配置和密钥改为环境变量
- 增加部署说明与测试说明

## 注意事项

- 当前仓库中前端完成度高于后端完成度
- `settings.py` 中存在开发阶段配置，上传公开仓库前建议自行检查并清理敏感信息
- 前端文档与界面原型较完整，适合作为后续真实系统开发蓝本

## License

当前仓库未声明许可证。如需开源到 GitHub，建议补充 `LICENSE` 文件，例如 MIT License。
