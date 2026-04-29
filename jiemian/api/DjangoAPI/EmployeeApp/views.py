print("views loaded")
import json
from django.shortcuts import render
from rest_framework.parsers import JSONParser
from django.http.response import JsonResponse
import re

from django.utils import timezone

from EmployeeApp.models import Agv, AgvLatestStatus, Departments, Employees, ProductionTask
from EmployeeApp.serializer import DepartmentSerializer, EmployeeSerializer
from django.views.decorators.csrf import csrf_exempt
# Create your views here.

from django.core.files.storage import default_storage


def _serialize_agv_item(agv):
    latest_status = getattr(agv, "latest_status", None)
    return {
        "id": agv.id,
        "name": agv.name,
        "model": agv.model,
        "status": latest_status.status if latest_status else "offline",
        "battery": latest_status.battery if latest_status else 0,
        "position_x": latest_status.position_x if latest_status else 0,
        "position_y": latest_status.position_y if latest_status else 0,
        "position_z": latest_status.position_z if latest_status else 0,
        "orientation": latest_status.orientation if latest_status else 0,
        "speed": latest_status.speed if latest_status else 0,
        "current_task_id": latest_status.current_task_id if latest_status else None,
        "current_task_summary": latest_status.current_task_summary if latest_status else "",
        "last_update": latest_status.last_update.isoformat().replace("+00:00", "Z") if latest_status else None,
    }


@csrf_exempt
def agvApi(request):
    if request.method == 'GET':
        status = request.GET.get('status')
        valid_status = {'running', 'idle', 'charging', 'error', 'offline'}
        if status:
            if status not in valid_status:
                return JsonResponse({
                    "code": 400,
                    "message": "invalid status",
                    "data": []
                }, status=400)

        agv_queryset = Agv.objects.select_related("latest_status").all().order_by("id")
        if status:
            agv_queryset = agv_queryset.filter(latest_status__status=status)

        items = [_serialize_agv_item(agv) for agv in agv_queryset]

        return JsonResponse({
            "code": 0,
            "message": "ok",
            "data": items
        }, safe=False)
    return JsonResponse("Method Not Allowed", safe=False, status=405)


@csrf_exempt
def departmentApi(request, id=0):
    if request.method == 'GET':
        departments = Departments.objects.all()
        departments_serializer = DepartmentSerializer(departments, many=True)
        return JsonResponse(departments_serializer.data, safe=False)
    elif request.method == 'POST':
        department_data = JSONParser().parse(request)
        department_serializer = DepartmentSerializer(data=department_data)
        if department_serializer.is_valid():
            department_serializer.save()
            return JsonResponse("Added Successfully", safe=False)
        return JsonResponse("Failed to Add", safe=False)
    elif request.method == 'PUT':
        department_data = JSONParser().parse(request)
        department = Departments.objects.get(DepartmentId=department_data['DepartmentId'])
        department_serializer = DepartmentSerializer(department, data=department_data)
        if department_serializer.is_valid():
            department_serializer.save()
            return JsonResponse("Updated Successfully", safe=False)
        return JsonResponse("Failed to Update", safe=False)
    elif request.method == 'DELETE':
        department = Departments.objects.get(DepartmentId=id)
        department.delete()
        return JsonResponse("Deleted Successfully", safe=False)
    return JsonResponse("Failed to Delete", safe=False)

@csrf_exempt
def employeeApi(request, id=0):
    if request.method == 'GET':
        employees = Employees.objects.all()
        employees_serializer = EmployeeSerializer(employees, many=True)
        return JsonResponse(employees_serializer.data, safe=False)
    elif request.method == 'POST':
        employee_data = JSONParser().parse(request)
        employee_serializer = EmployeeSerializer(data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse("Added Successfully", safe=False)
        return JsonResponse("Failed to Add", safe=False)
    elif request.method == 'PUT':
        employee_data = JSONParser().parse(request)
        employee = Employees.objects.get(EmployeeId=employee_data['EmployeeId'])
        employee_serializer = EmployeeSerializer(employee, data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse("Updated Successfully", safe=False)
        return JsonResponse("Failed to Update", safe=False)
    elif request.method == 'DELETE':
        employee = Employees.objects.get(EmployeeId=id)
        employee.delete()
        return JsonResponse("Deleted Successfully", safe=False)
    return JsonResponse("Failed to Delete", safe=False)

@csrf_exempt
def saveFile(request):
    file = request.FILES['file']
    file_name = default_storage.save(file.name, file)
    return JsonResponse(file_name, safe=False)


# --- 物料检测与绑定（ui要求.md：可先使用模拟数据，再接真实算法/任务系统） ---


@csrf_exempt
def materialBindApi(request):
    """POST /api/material/bind — 模拟检测与绑定结果"""
    if request.method != "POST":
        return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)
    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"code": 400, "message": "invalid json"}, status=400)

    agv_id = str(body.get("agv_id", "0"))
    material_data = body.get("material_data") or {}
    expected = str(material_data.get("expected_type", "pro")).lower()

    # 演示：若请求里带 "simulate_fail": true 则返回不合格，便于测试
    simulate_fail = material_data.get("simulate_fail") is True
    qualified = not simulate_fail

    inspection_result = {
        "qualified": qualified,
        "defect_type": None if qualified else "scratch",
        "defect_count": 0 if qualified else 1,
        "confidence": 0.98 if qualified else 0.72,
        "details": {
            "scratch_length": 0 if qualified else 3.2,
            "position": None if qualified else {"x": 120, "y": 85},
        },
    }

    from django.utils import timezone

    now = timezone.now()
    binding_id = "BIND_" + now.strftime("%Y%m%d%H%M%S")

    payload = {
        "binding_id": binding_id,
        "status": "success" if qualified else "failed",
        "agv_id": agv_id,
        "material_type": expected or "unknown",
        "inspection_result": inspection_result,
        "binding_time": now.isoformat().replace("+00:00", "Z"),
        "task_created": "T-012" if qualified else None,
        "error_message": None if qualified else "划痕检测不合格",
    }
    return JsonResponse(payload, safe=False)


@csrf_exempt
def materialHistoryApi(request):
    """GET /api/material/history — 返回最近检测记录（演示数据）"""
    if request.method != "GET":
        return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)

    items = [
        {
            "id": "023",
            "binding_id": "BIND_20241201143015",
            "agv_id": "3",
            "material_type": "标准版",
            "expected_type": "标准版",
            "qualified": True,
            "inspect_time": "14:30:15",
            "inspection_result": {"qualified": True, "defect_count": 0},
            "bind_summary": "已绑定",
            "task_created": "T-101",
        },
        {
            "id": "022",
            "binding_id": "BIND_20241201142840",
            "agv_id": "1",
            "material_type": "Pro版",
            "expected_type": "Pro版",
            "qualified": True,
            "inspect_time": "14:28:40",
            "inspection_result": {"qualified": True, "defect_count": 0},
            "bind_summary": "已绑定",
            "task_created": "T-100",
        },
        {
            "id": "021",
            "binding_id": "BIND_20241201142512",
            "agv_id": "2",
            "material_type": "Pro版",
            "expected_type": "Pro版",
            "qualified": False,
            "inspect_time": "14:25:12",
            "inspection_result": {
                "qualified": False,
                "defect_type": "scratch",
                "defect_count": 1,
            },
            "bind_summary": "绑定失败",
            "task_created": None,
        },
    ]
    return JsonResponse({"items": items}, safe=False)


@csrf_exempt
def materialNotImplementedApi(request):
    """占位：重新检测 / 强制通过 / 导出 等，后续接真实逻辑"""
    return JsonResponse(
        {"code": 501, "message": "接口占位，请在后端实现业务逻辑"},
        status=501,
    )


# --- 事件日志（事件日志部分ui.md 11.1） ---


def eventsListApi(request):
    """GET /api/events — 演示数据，支持 level / module / limit 简单过滤

    时间戳使用固定锚点，避免每次轮询都用「当前时刻」导致假事件看起来一直在刷新。
    """
    if request.method != "GET":
        return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)

    from datetime import datetime, timedelta, timezone as dt_tz

    # 与 event_id 中日期一致；勿用 timezone.now() 作为相对基准，否则 T-015 等会随请求「变成刚才」
    _demo_anchor = datetime(2024, 12, 1, 14, 30, 15, tzinfo=dt_tz.utc)

    def _demo_ts(mins_ago):
        return (_demo_anchor - timedelta(minutes=mins_ago)).isoformat().replace("+00:00", "Z")

    base_events = [
        {
            "id": 127,
            "timestamp": _demo_ts(0),
            "event_id": "EVT_20241201143015_127",
            "level": "INFO",
            "module": "任务系统",
            "event_code": "TASK_CREATED",
            "message": "【演示】任务T-015(Pro版)已创建，分配给AGV#2。",
            "details": {"agv_id": "2", "task_id": "T-015"},
        },
        {
            "id": 126,
            "timestamp": _demo_ts(2),
            "event_id": "EVT_20241201142840_126",
            "level": "INFO",
            "module": "任务系统",
            "event_code": "TASK_COMPLETED",
            "message": "【演示】AGV#3到达下线点，任务T-014完成。",
            "details": {"agv_id": "3", "task_id": "T-014"},
        },
        {
            "id": 125,
            "timestamp": _demo_ts(5),
            "event_id": "EVT_20241201142512_125",
            "level": "WARN",
            "module": "AGV调度",
            "event_code": "AGV_WAIT_TIMEOUT",
            "message": "【演示】AGV#2在工位3等待超时(2分15秒)。",
            "details": {
                "agv_id": "2",
                "station": "工位3",
                "wait_time": 135,
                "task_id": "T-013",
                "handle_status": "已自动处理",
                "handle_method": "重新规划路径",
                "handle_result": "AGV#2已跳过工位3",
                "handle_time": "14:25:30",
                "related_chain": [
                    {"id": 123, "summary": "14:23:05 [信息] AGV#2到达工位3。"},
                    {"id": 124, "summary": "14:24:30 [警告] 工位3机械臂响应缓慢。"},
                ],
            },
        },
        {
            "id": 124,
            "timestamp": _demo_ts(7),
            "event_id": "EVT_20241201142305_124",
            "level": "INFO",
            "module": "物料检测",
            "event_code": "MATERIAL_INSPECTED",
            "message": "【演示】物料检测合格，Pro版物料已绑定到AGV#2。",
            "details": {},
        },
        {
            "id": 123,
            "timestamp": _demo_ts(10),
            "event_id": "EVT_20241201142031_123",
            "level": "INFO",
            "module": "AGV调度",
            "message": "【演示】AGV#1开始充电，电量: 15%。",
            "details": {"agv_id": "1"},
        },
        {
            "id": 122,
            "timestamp": _demo_ts(12),
            "event_id": "EVT_20241201141812_122",
            "level": "ERROR",
            "module": "工位控制",
            "event_code": "DEVICE_CONNECTION_LOST",
            "message": "【演示】上料位相机通信中断，已尝试重连。",
            "details": {},
        },
        {
            "id": 121,
            "timestamp": _demo_ts(15),
            "event_id": "EVT_20241201141547_121",
            "level": "INFO",
            "module": "系统",
            "message": "【演示】系统启动完成，4台AGV在线。",
            "details": {},
        },
    ]

    level_q = (request.GET.get("level") or "").lower()
    module_q = request.GET.get("module") or ""
    try:
        limit = int(request.GET.get("limit") or 100)
    except ValueError:
        limit = 100
    limit = max(1, min(limit, 500))

    filtered = []
    level_map = {"info": "INFO", "warn": "WARN", "error": "ERROR"}
    want_level = level_map.get(level_q) if level_q in level_map else None

    for e in base_events:
        if want_level and e["level"] != want_level:
            continue
        if module_q and module_q != "全部" and e["module"] != module_q:
            continue
        filtered.append(e)

    filtered = filtered[:limit]
    return JsonResponse({"events": filtered, "total": len(base_events)})


# --- 生产任务持久化（MySQL production_task） ---


def _parse_iso_datetime(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    from datetime import datetime

    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _format_iso(dt):
    if not dt:
        return ""
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt.isoformat().replace("+00:00", "Z")


def _next_task_number_suggestion():
    codes = ProductionTask.objects.values_list("task_code", flat=True)
    max_n = 0
    for code in codes:
        m = re.search(r"(\d+)$", str(code))
        if m:
            max_n = max(max_n, int(m.group(1)))
    return max_n + 1


def _production_task_to_json(row):
    timeline = row.timeline_json if isinstance(row.timeline_json, list) else []
    updated_at = ""
    if timeline:
        last = timeline[-1]
        updated_at = last.get("time") or ""
    if not updated_at:
        updated_at = _format_iso(row.finished_at) or _format_iso(row.started_at) or _format_iso(row.created_at)
    return {
        "id": row.task_code,
        "productModel": row.product_model,
        "quantity": row.quantity,
        "completedUnits": row.completed_units,
        "priority": row.priority,
        "status": row.status,
        "agvId": row.agv_id or "",
        "currentStation": row.current_station or "上料位",
        "remark": row.remark or "",
        "createdAt": _format_iso(row.created_at),
        "startedAt": _format_iso(row.started_at),
        "finishedAt": _format_iso(row.finished_at),
        "updatedAt": updated_at,
        "timeline": timeline,
    }


def _payload_apply_to_instance(row, payload):
    row.product_model = str(payload.get("productModel") or row.product_model or "")
    row.quantity = int(payload.get("quantity") or row.quantity or 1)
    row.completed_units = int(payload.get("completedUnits") or 0)
    row.priority = str(payload.get("priority") or "normal")[:20]
    row.status = str(payload.get("status") or "waiting")[:20]
    row.agv_id = str(payload.get("agvId") or "")[:32]
    row.current_station = str(payload.get("currentStation") or "上料位")[:100]
    row.remark = str(payload.get("remark") or "")[:500]
    if "createdAt" in payload:
        created = _parse_iso_datetime(payload.get("createdAt"))
        if created:
            row.created_at = created
    if "startedAt" in payload:
        row.started_at = _parse_iso_datetime(payload.get("startedAt"))
    if "finishedAt" in payload:
        row.finished_at = _parse_iso_datetime(payload.get("finishedAt"))
    if "timeline" in payload and isinstance(payload.get("timeline"), list):
        row.timeline_json = payload["timeline"]


@csrf_exempt
def productionTasksApi(request):
    """GET /api/v1/tasks — 列表；POST /api/v1/tasks — 新建"""
    if request.method == "GET":
        rows = list(ProductionTask.objects.all())
        data = [_production_task_to_json(r) for r in rows]
        return JsonResponse({"tasks": data, "nextTaskNumber": _next_task_number_suggestion()}, safe=False)

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"message": "JSON 无效"}, status=400)
        task_code = str(payload.get("id") or "").strip()
        if not task_code:
            return JsonResponse({"message": "缺少任务 id"}, status=400)
        if ProductionTask.objects.filter(task_code=task_code).exists():
            return JsonResponse({"message": "任务编号已存在"}, status=409)
        created_at = _parse_iso_datetime(payload.get("createdAt")) or timezone.now()
        row = ProductionTask(
            task_code=task_code,
            product_model=str(payload.get("productModel") or "标准版")[:100],
            quantity=max(1, int(payload.get("quantity") or 1)),
            completed_units=max(0, int(payload.get("completedUnits") or 0)),
            priority=str(payload.get("priority") or "normal")[:20],
            status=str(payload.get("status") or "waiting")[:20],
            agv_id=str(payload.get("agvId") or "")[:32],
            current_station=str(payload.get("currentStation") or "上料位")[:100],
            remark=str(payload.get("remark") or "")[:500],
            created_at=created_at,
            started_at=_parse_iso_datetime(payload.get("startedAt")),
            finished_at=_parse_iso_datetime(payload.get("finishedAt")),
            timeline_json=payload.get("timeline") if isinstance(payload.get("timeline"), list) else [],
        )
        row.save()
        return JsonResponse(_production_task_to_json(row), safe=False, status=201)

    return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)


@csrf_exempt
def productionTaskDetailApi(request, task_code):
    """PUT /api/v1/tasks/<task_code> — 全量更新（含 timeline）"""
    task_code = str(task_code or "").strip()
    if not task_code:
        return JsonResponse({"message": "缺少任务编号"}, status=400)

    if request.method == "PUT":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"message": "JSON 无效"}, status=400)
        try:
            row = ProductionTask.objects.get(task_code=task_code)
        except ProductionTask.DoesNotExist:
            return JsonResponse({"message": "任务不存在"}, status=404)
        body_id = str(payload.get("id") or "").strip()
        if body_id and body_id != task_code:
            return JsonResponse({"message": "路径与 body 中 id 不一致"}, status=400)
        _payload_apply_to_instance(row, payload)
        if not row.created_at:
            row.created_at = timezone.now()
        row.save()
        return JsonResponse(_production_task_to_json(row), safe=False)

    return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)


@csrf_exempt
def agvReportApi(request):
    """Ubuntu ROS2 上报接口：POST /api/v1/agv/report
    body: {
        "agv_id": 1, "agv_name": "AGV-001", "agv_model": "R550",
        "status": "idle",
        "battery": 85.0,
        "position_x": 1.2, "position_y": 0.5, "position_z": 0.0,
        "orientation": 45.0,
        "speed": 0.0
    }
    """
    if request.method != 'POST':
        return JsonResponse({"code": 405, "message": "Method Not Allowed"}, status=405)

    try:
        data = JSONParser().parse(request)
    except Exception:
        return JsonResponse({"code": 400, "message": "invalid JSON"}, status=400)

    agv_id    = int(data.get("agv_id", 1))
    agv_name  = str(data.get("agv_name", "AGV-001"))
    agv_model = str(data.get("agv_model", "R550"))

    agv, _ = Agv.objects.get_or_create(
        id=agv_id,
        defaults={"name": agv_name, "model": agv_model},
    )

    AgvLatestStatus.objects.update_or_create(
        agv=agv,
        defaults={
            "status":             str(data.get("status", "idle")),
            "battery":            float(data.get("battery", 0)),
            "position_x":         float(data.get("position_x", 0)),
            "position_y":         float(data.get("position_y", 0)),
            "position_z":         float(data.get("position_z", 0)),
            "orientation":        float(data.get("orientation", 0)),
            "speed":              float(data.get("speed", 0)),
            "current_task_id":    data.get("current_task_id"),
            "current_task_summary": str(data.get("current_task_summary", "")),
            "last_update":        timezone.now(),
        },
    )
    return JsonResponse({"code": 0, "message": "ok"})
