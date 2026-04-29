from django.db import models

# Create your models here.
class Departments(models.Model):
    DepartmentId = models.AutoField(primary_key=True)
    DepartmentName = models.CharField(max_length=500)

class Employees(models.Model):
    EmployeeId = models.AutoField(primary_key=True)
    EmployeeName = models.CharField(max_length=500)
    Department = models.CharField(max_length=500)
    DateOfJoining = models.DateField()
    PhotoFileName = models.CharField(max_length=500)


class Agv(models.Model):
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    model = models.CharField(max_length=100, default="R550")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "agv"


class AgvLatestStatus(models.Model):
    agv = models.OneToOneField(
        Agv,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="latest_status",
        db_column="agv_id",
    )
    status = models.CharField(max_length=20, default="offline")
    battery = models.FloatField(default=0)
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    position_z = models.FloatField(default=0)
    orientation = models.FloatField(default=0)
    speed = models.FloatField(default=0)
    current_task_id = models.IntegerField(null=True, blank=True)
    current_task_summary = models.CharField(max_length=255, blank=True, default="")
    last_update = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "agv_latest_status"


class ProductionTask(models.Model):
    """生产任务（与前端任务管理终端字段对应，持久化到 MySQL）"""

    task_code = models.CharField(max_length=32, primary_key=True)
    product_model = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    completed_units = models.PositiveIntegerField(default=0)
    priority = models.CharField(max_length=20, default="normal")
    status = models.CharField(max_length=20, default="waiting")
    agv_id = models.CharField(max_length=32, blank=True, default="")
    current_station = models.CharField(max_length=100, default="上料位")
    remark = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    timeline_json = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "production_task"
        ordering = ["-created_at"]

    def __str__(self):
        return self.task_code