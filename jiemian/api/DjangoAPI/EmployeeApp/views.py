print("views loaded")
from django.shortcuts import render
from rest_framework.parsers import JSONParser
from django.http.response import JsonResponse
from EmployeeApp.models import Agv, Departments, Employees
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
        