from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("EmployeeApp", "0002_agv_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductionTask",
            fields=[
                ("task_code", models.CharField(max_length=32, primary_key=True, serialize=False)),
                ("product_model", models.CharField(max_length=100)),
                ("quantity", models.PositiveIntegerField()),
                ("completed_units", models.PositiveIntegerField(default=0)),
                ("priority", models.CharField(default="normal", max_length=20)),
                ("status", models.CharField(default="waiting", max_length=20)),
                ("agv_id", models.CharField(blank=True, default="", max_length=32)),
                ("current_station", models.CharField(default="上料位", max_length=100)),
                ("remark", models.CharField(blank=True, default="", max_length=500)),
                ("created_at", models.DateTimeField()),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("timeline_json", models.JSONField(blank=True, default=list)),
            ],
            options={
                "db_table": "production_task",
                "ordering": ["-created_at"],
            },
        ),
    ]
