from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("EmployeeApp", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Agv",
            fields=[
                ("id", models.IntegerField(primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("model", models.CharField(default="R550", max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "agv",
            },
        ),
        migrations.CreateModel(
            name="AgvLatestStatus",
            fields=[
                ("status", models.CharField(default="offline", max_length=20)),
                ("battery", models.FloatField(default=0)),
                ("position_x", models.FloatField(default=0)),
                ("position_y", models.FloatField(default=0)),
                ("position_z", models.FloatField(default=0)),
                ("orientation", models.FloatField(default=0)),
                ("speed", models.FloatField(default=0)),
                ("current_task_id", models.IntegerField(blank=True, null=True)),
                ("current_task_summary", models.CharField(blank=True, default="", max_length=255)),
                ("last_update", models.DateTimeField(auto_now=True)),
                (
                    "agv",
                    models.OneToOneField(
                        db_column="agv_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="latest_status",
                        serialize=False,
                        to="EmployeeApp.agv",
                    ),
                ),
            ],
            options={
                "db_table": "agv_latest_status",
            },
        ),
    ]
