/** 与 index.html 中 .dashboard 的 --color-text-secondary 一致，供 ECharts 使用 */
const DASH_TEXT_MUTED = '#A8B2BE';

const home = {
    template: `
    <div class="dashboard">
        <div class="page-title-bar">
            <div>
                <div class="page-title">监控总览</div>
                <div class="page-subtitle">系统运行状态实时概览</div>
            </div>
            <div style="font-size:14px; color:var(--color-text-secondary);">
                最后更新: {{ lastUpdateTime }}
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="glass-card kpi-card" v-for="kpi in kpiCards" :key="kpi.key">
                <div class="kpi-header">
                    <div class="kpi-icon" :style="{ background: kpi.iconBg }">
                        <svg v-if="kpi.key==='agv'" viewBox="0 0 24 24" fill="none" :stroke="kpi.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                        </svg>
                        <svg v-if="kpi.key==='tasks'" viewBox="0 0 24 24" fill="none" :stroke="kpi.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                        </svg>
                        <svg v-if="kpi.key==='events'" viewBox="0 0 24 24" fill="none" :stroke="kpi.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <svg v-if="kpi.key==='battery'" viewBox="0 0 24 24" fill="none" :stroke="kpi.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="10" x2="23" y2="14"/><line x1="5" y1="10" x2="5" y2="14"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="13" y1="10" x2="13" y2="14"/>
                        </svg>
                        <svg v-if="kpi.key==='mileage'" viewBox="0 0 24 24" fill="none" :stroke="kpi.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <span class="kpi-change" :class="kpi.changeDir">
                        <span v-if="kpi.changeDir==='up'">↑</span>
                        <span v-if="kpi.changeDir==='down'">↓</span>
                        {{ kpi.changeText }}
                    </span>
                </div>
                <div class="kpi-value">{{ kpi.value }}</div>
                <div class="kpi-label">{{ kpi.label }}</div>
            </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="charts-grid">
            <div class="glass-card chart-card">
                <div class="chart-title">任务完成趋势（近7天）</div>
                <div class="chart-container" ref="taskTrendChart"></div>
            </div>
            <div class="glass-card chart-card">
                <div class="chart-title">AGV 状态分布</div>
                <div class="chart-container" ref="agvDistChart"></div>
            </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="charts-grid">
            <div class="glass-card chart-card">
                <div class="chart-title">能耗统计（近7天）</div>
                <div class="chart-container" ref="energyChart"></div>
            </div>
            <div class="glass-card events-card">
                <div class="events-header">
                    <span class="events-title">最近异常事件</span>
                    <a class="view-more" href="#/events">查看全部</a>
                </div>
                <div>
                    <div class="event-row" v-for="evt in recentEvents" :key="evt.id">
                        <span class="event-badge" :class="evt.type">{{ evt.typeLabel }}</span>
                        <span class="event-agv">{{ evt.agvName }}</span>
                        <span class="event-message">{{ evt.message }}</span>
                        <span class="event-time">{{ evt.time }}</span>
                    </div>
                    <div v-if="recentEvents.length === 0" style="text-align:center; color:var(--color-text-secondary); padding:40px 0; font-size:15px;">
                        暂无异常事件
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            lastUpdateTime: '',
            summary: {
                agv_online: 5,
                agv_total: 5,
                tasks_today: 128,
                tasks_running: 3,
                events_unhandled: 2,
                avg_battery: 78.2,
                total_mileage_km: 1024.5,
                tasks_yesterday: 115,
                events_yesterday: 5,
                battery_yesterday: 75.0,
                mileage_yesterday: 980.2
            },
            taskTrend: [
                { date: '03-14', completed: 98, failed: 2 },
                { date: '03-15', completed: 112, failed: 1 },
                { date: '03-16', completed: 105, failed: 3 },
                { date: '03-17', completed: 130, failed: 0 },
                { date: '03-18', completed: 118, failed: 2 },
                { date: '03-19', completed: 125, failed: 1 },
                { date: '03-20', completed: 128, failed: 2 }
            ],
            agvDistribution: [
                { status: 'running', label: '运行中', count: 3, color: '#52c41a' },
                { status: 'idle', label: '待机', count: 1, color: '#13c2c2' },
                { status: 'charging', label: '充电中', count: 1, color: '#fa8c16' },
                { status: 'offline', label: '离线', count: 0, color: '#8c8c8c' },
                { status: 'error', label: '故障', count: 0, color: '#f5222d' }
            ],
            energyData: [
                { date: '03-14', energy: 10.2, mileage: 142.5 },
                { date: '03-15', energy: 11.8, mileage: 158.3 },
                { date: '03-16', energy: 10.5, mileage: 148.0 },
                { date: '03-17', energy: 13.2, mileage: 170.1 },
                { date: '03-18', energy: 11.0, mileage: 152.8 },
                { date: '03-19', energy: 12.5, mileage: 163.4 },
                { date: '03-20', energy: 12.0, mileage: 156.2 }
            ],
            recentEvents: [
                { id: 1, type: 'error', typeLabel: '异常', agvName: 'AGV-003', message: '路径偏离阈值超过 0.5m，已紧急停车', time: '14:32' },
                { id: 2, type: 'warning', typeLabel: '警告', agvName: 'AGV-002', message: '电量低于 20%，建议前往充电桩', time: '14:20' },
                { id: 3, type: 'warning', typeLabel: '警告', agvName: 'AGV-005', message: '通信延迟超过 500ms，信号质量下降', time: '13:55' },
                { id: 4, type: 'info', typeLabel: '信息', agvName: 'AGV-001', message: '已完成自动充电，电量恢复至 95%', time: '13:40' },
                { id: 5, type: 'error', typeLabel: '异常', agvName: 'AGV-004', message: '机械臂抓取失败，物料检测异常', time: '12:18' },
                { id: 6, type: 'info', typeLabel: '信息', agvName: 'AGV-002', message: '任务 #1089 已完成，用时 8 分 32 秒', time: '11:50' }
            ],
            chartInstances: {}
        };
    },

    computed: {
        kpiCards() {
            const s = this.summary;
            const taskChange = s.tasks_today - s.tasks_yesterday;
            const eventChange = s.events_unhandled - s.events_yesterday;
            const batteryChange = (s.avg_battery - s.battery_yesterday).toFixed(1);
            const mileageChange = (s.total_mileage_km - s.mileage_yesterday).toFixed(1);

            return [
                {
                    key: 'agv',
                    label: 'AGV 在线',
                    value: s.agv_online + ' / ' + s.agv_total,
                    iconBg: 'rgba(82,196,26,0.12)',
                    iconColor: '#52c41a',
                    changeDir: 'up',
                    changeText: '全部在线'
                },
                {
                    key: 'tasks',
                    label: '今日任务',
                    value: s.tasks_today,
                    iconBg: 'rgba(74,144,217,0.12)',
                    iconColor: '#4A90D9',
                    changeDir: taskChange >= 0 ? 'up' : 'down',
                    changeText: '较昨日 ' + (taskChange >= 0 ? '+' : '') + taskChange
                },
                {
                    key: 'events',
                    label: '未处理异常',
                    value: s.events_unhandled,
                    iconBg: 'rgba(245,34,45,0.12)',
                    iconColor: '#f5222d',
                    changeDir: eventChange <= 0 ? 'up' : 'down',
                    changeText: '较昨日 ' + (eventChange >= 0 ? '+' : '') + eventChange
                },
                {
                    key: 'battery',
                    label: '平均电量',
                    value: s.avg_battery + '%',
                    iconBg: 'rgba(82,196,26,0.12)',
                    iconColor: '#52c41a',
                    changeDir: batteryChange >= 0 ? 'up' : 'down',
                    changeText: (batteryChange >= 0 ? '+' : '') + batteryChange + '%'
                },
                {
                    key: 'mileage',
                    label: '累计里程',
                    value: s.total_mileage_km.toLocaleString() + ' km',
                    iconBg: 'rgba(74,144,217,0.12)',
                    iconColor: '#4A90D9',
                    changeDir: 'up',
                    changeText: '+' + mileageChange + ' km'
                }
            ];
        }
    },

    mounted() {
        this.updateTime();
        this.timeInterval = setInterval(() => this.updateTime(), 60000);

        this.$nextTick(() => {
            this.initTaskTrendChart();
            this.initAgvDistChart();
            this.initEnergyChart();
        });

        this.resizeHandler = () => {
            Object.values(this.chartInstances).forEach(c => c && c.resize());
        };
        window.addEventListener('resize', this.resizeHandler);
    },

    beforeUnmount() {
        if (this.timeInterval) clearInterval(this.timeInterval);
        window.removeEventListener('resize', this.resizeHandler);
        Object.values(this.chartInstances).forEach(c => c && c.dispose());
    },

    methods: {
        updateTime() {
            const now = new Date();
            this.lastUpdateTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        },

        initTaskTrendChart() {
            const el = this.$refs.taskTrendChart;
            if (!el) return;
            const chart = echarts.init(el);
            this.chartInstances.taskTrend = chart;

            chart.setOption({
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    textStyle: { color: '#E0E6ED', fontSize: 14 },
                    axisPointer: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
                },
                legend: {
                    data: ['已完成', '失败'],
                    top: 0,
                    right: 0,
                    textStyle: { color: DASH_TEXT_MUTED, fontSize: 14 },
                    icon: 'roundRect',
                    itemWidth: 12,
                    itemHeight: 3
                },
                grid: { left: 40, right: 16, top: 32, bottom: 24 },
                xAxis: {
                    type: 'category',
                    data: this.taskTrend.map(d => d.date),
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
                    axisTick: { show: false },
                    axisLabel: { color: DASH_TEXT_MUTED, fontSize: 15 }
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { color: DASH_TEXT_MUTED, fontSize: 15 }
                },
                series: [
                    {
                        name: '已完成',
                        type: 'line',
                        data: this.taskTrend.map(d => d.completed),
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { color: '#4A90D9', width: 2 },
                        itemStyle: { color: '#4A90D9' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(74,144,217,0.20)' },
                                { offset: 1, color: 'rgba(74,144,217,0.02)' }
                            ])
                        }
                    },
                    {
                        name: '失败',
                        type: 'line',
                        data: this.taskTrend.map(d => d.failed),
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { color: '#f5222d', width: 2 },
                        itemStyle: { color: '#f5222d' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(245,34,45,0.15)' },
                                { offset: 1, color: 'rgba(245,34,45,0.02)' }
                            ])
                        }
                    }
                ]
            });
        },

        initAgvDistChart() {
            const el = this.$refs.agvDistChart;
            if (!el) return;
            const chart = echarts.init(el);
            this.chartInstances.agvDist = chart;

            chart.setOption({
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    textStyle: { color: '#E0E6ED', fontSize: 14 },
                    formatter: '{b}: {c} 台 ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    right: 16,
                    top: 'center',
                    textStyle: { color: DASH_TEXT_MUTED, fontSize: 14 },
                    icon: 'circle',
                    itemWidth: 8,
                    itemHeight: 8,
                    itemGap: 16,
                    data: this.agvDistribution.map(d => d.label)
                },
                series: [{
                    type: 'pie',
                    radius: ['45%', '70%'],
                    center: ['35%', '50%'],
                    padAngle: 3,
                    itemStyle: { borderColor: '#0B0F18', borderWidth: 2, borderRadius: 4 },
                    label: {
                        show: true,
                        position: 'center',
                        formatter: () => {
                            const total = this.agvDistribution.reduce((s, d) => s + d.count, 0);
                            return '{num|' + total + '}\n{text|台 AGV}';
                        },
                        rich: {
                            num: { fontSize: 28, fontWeight: 600, color: '#E0E6ED', lineHeight: 36 },
                            text: { fontSize: 14, color: DASH_TEXT_MUTED, lineHeight: 22 }
                        }
                    },
                    data: this.agvDistribution.map(d => ({
                        name: d.label,
                        value: d.count,
                        itemStyle: { color: d.color }
                    }))
                }]
            });
        },

        initEnergyChart() {
            const el = this.$refs.energyChart;
            if (!el) return;
            const chart = echarts.init(el);
            this.chartInstances.energy = chart;

            chart.setOption({
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    textStyle: { color: '#E0E6ED', fontSize: 14 },
                    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.03)' } }
                },
                legend: {
                    data: ['能耗 (kWh)', '里程 (km)'],
                    top: 0,
                    right: 0,
                    textStyle: { color: DASH_TEXT_MUTED, fontSize: 14 },
                    icon: 'roundRect',
                    itemWidth: 12,
                    itemHeight: 3
                },
                grid: { left: 48, right: 48, top: 32, bottom: 24 },
                xAxis: {
                    type: 'category',
                    data: this.energyData.map(d => d.date),
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
                    axisTick: { show: false },
                    axisLabel: { color: DASH_TEXT_MUTED, fontSize: 14 }
                },
                yAxis: [
                    {
                        type: 'value',
                        name: 'kWh',
                        nameTextStyle: { color: DASH_TEXT_MUTED, fontSize: 14 },
                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { color: DASH_TEXT_MUTED, fontSize: 14 }
                    },
                    {
                        type: 'value',
                        name: 'km',
                        nameTextStyle: { color: DASH_TEXT_MUTED, fontSize: 14 },
                        splitLine: { show: false },
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { color: DASH_TEXT_MUTED, fontSize: 14 }
                    }
                ],
                series: [
                    {
                        name: '能耗 (kWh)',
                        type: 'bar',
                        data: this.energyData.map(d => d.energy),
                        barWidth: 20,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(74,144,217,0.7)' },
                                { offset: 1, color: 'rgba(74,144,217,0.2)' }
                            ]),
                            borderRadius: [4, 4, 0, 0]
                        }
                    },
                    {
                        name: '里程 (km)',
                        type: 'line',
                        yAxisIndex: 1,
                        data: this.energyData.map(d => d.mileage),
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { color: '#52c41a', width: 2 },
                        itemStyle: { color: '#52c41a' }
                    }
                ]
            });
        }
    }
};

window.home = home;
