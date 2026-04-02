const AGV_COMPONENT_META = {
    chassis: {
        key: 'chassis',
        name: '移动底盘',
        shortName: '底盘',
        keywords: ['agv_chassis', 'chassis', 'wheel', 'wheelhub', 'compassq2', '底盘', '轮'],
        params: [
            { label: '当前速度', value: '0.56 m/s' }
        ],
        statusText: '悬挂与轮组工作稳定',
        health: 98,
        alarm: '无告警',
        state: 'normal'
    },
    arm: {
        key: 'arm',
        name: '协作机械臂',
        shortName: '机械臂',
        keywords: ['robotic_arm', 'arm', 'joint', 'gripper', 'vacuum', '夹爪', '机械臂', '吸盘'],
        params: [
            { label: '关节运行状态', value: '待命' },
            { label: '末端力反馈', value: '0.8 N' }
        ],
        statusText: '抓取任务待命中',
        health: 95,
        alarm: '真空回路正常',
        state: 'normal'
    },
    lidar: {
        key: 'lidar',
        name: '激光雷达',
        shortName: '激光雷达',
        keywords: ['comp_lidar', 'lidar', 'laser', 'scanner', '雷达'],
        params: [
            { label: '建图状态', value: 'SLAM 已锁定' },
            { label: '障碍检测', value: '18 个动态目标' }
        ],
        statusText: '定位精度正常',
        health: 97,
        alarm: '无告警',
        state: 'normal'
    },
    camera: {
        key: 'camera',
        name: '深度相机',
        shortName: '深度相机',
        keywords: ['depth_camera', 'camera', 'stereo', 'depth', 'vision', '相机'],
        params: [
            { label: '当前任务', value: '托盘边缘校正' }
        ],
        statusText: '目标识别持续输出',
        health: 94,
        alarm: '低光补偿已启用',
        state: 'warning'
    },
    mic: {
        key: 'mic',
        name: '麦克风阵列',
        shortName: '麦克风阵列',
        keywords: ['microphone_array', 'microphone', 'mic', 'audio', 'voice', '麦克风'],
        params: [
            { label: '降噪状态', value: '双通道降噪开启' },
            { label: '语音识别', value: '在线' },
            { label: '声学监测', value: '轴噪正常' }
        ],
        statusText: '语音交互通道可用',
        health: 92,
        alarm: '环境噪声偏高',
        state: 'warning'
    },
    compute: {
        key: 'compute',
        name: '边缘计算平台',
        shortName: '计算平台',
        keywords: ['rdk', 'compute', 'controller', 'cpu', '计算'],
        params: [
            { label: 'CPU 使用率', value: '46%' },
            { label: '内存占用', value: '5.8 / 8 GB' },
            { label: '温度', value: '58°C' }
        ],
        statusText: '多模态智能体运行中',
        health: 96,
        alarm: '推理负载正常',
        state: 'normal'
    },
    battery: {
        key: 'battery',
        name: '电池系统',
        shortName: '电池',
        keywords: ['battery', 'battery_pack', 'cell', 'pack', '电池'],
        params: [
            { label: '实时电压', value: '12.1 V' },
            { label: '剩余电量', value: '78%' }
        ],
        statusText: '供电稳定',
        health: 96,
        alarm: '无告警',
        state: 'normal'
    }
};

const AGV_COMPONENT_NAME_MAP = {
    'robotic_arm.empties': 'arm',
    'robotic_arm': 'arm',
    'agv_chassis': 'chassis',
    'rdk': 'compute',
    'battery': 'battery',
    'comp_lidar': 'lidar',
    'depth_camera': 'camera',
    'microphone_array': 'mic'
};

// EdgesGeometry 夹角阈值（度）：圆角面无法形成锐棱，需更低阈值才能看到三角网格棱线；可按 GLB 节点名扩展关键词
const AGV_EDGE_THRESHOLD_DEFAULT = 22;
const AGV_EDGE_THRESHOLD_ROUNDED_PART = 5;
const AGV_EDGE_ROUNDED_NAME_KEYWORDS = [
    'platform', 'turntable', 'swivel', 'rotat', 'plate', 'pivot',
    '转台', '旋板', '托盘', '旋转', '底座'
];

const AGV_STATUS_META = {
    auto: { label: '自动运行', color: '#52c41a' },
    manual: { label: '人工接管', color: '#faad14' },
    charging: { label: '充电中', color: '#13c2c2' }
};

const agv = {
    template: `
    <div class="agv-detail-page" @click="handleBlankAreaClick">
        <div class="page-title-bar agv-page-title">
            <div>
                <div class="page-title">AGV 管理</div>
            </div>
            <div class="agv-page-meta">
                <span class="agv-meta-pill">{{ agvInfo.id }}</span>
                <span class="agv-meta-pill" :style="statusPillStyle">{{ modeLabel }}</span>
                <span>最后更新: {{ lastUpdateTime }}</span>
            </div>
        </div>

        <div ref="cardBoundary" class="agv-detail-layout">
            <section class="glass-card agv-model-panel">
                <div class="agv-panel-header">
                    <div class="agv-model-actions" @click.stop>
                        <button class="map-action-btn" @click="resetCamera">重置视角</button>
                        <button class="map-action-btn" @click="focusSelectedPart" :disabled="!activeComponentKey">聚焦部件</button>
                    </div>
                </div>

                <div class="agv-model-shell">
                    <div ref="modelViewport" class="agv-model-viewport"></div>

                    <div v-if="sceneLoading" class="map-overlay">
                        <div class="map-overlay-card">
                            <div class="map-overlay-title">正在加载 AGV 3D 模型</div>
                            <div class="map-overlay-text">初始化光照、交互控件与部件拾取区域...</div>
                        </div>
                    </div>

                    <div v-if="sceneNote && !sceneLoading" class="agv-scene-note glass-card">
                        {{ sceneNote }}
                    </div>

                    <div v-if="hoverTag.visible" class="agv-hover-tag glass-card" :style="{ left: hoverTag.x + 'px', top: hoverTag.y + 'px' }">
                        {{ hoverTag.label }}
                    </div>
                </div>
            </section>

            <section class="agv-info-panel" @click="handleInfoPanelClick">
                <div class="agv-component-legend glass-card" @click.stop>
                    <div class="agv-legend-title">部件快速查看</div>
                    <button
                        v-for="item in componentList"
                        :key="item.key"
                        class="agv-legend-chip"
                        :class="{ active: openComponentKeys.includes(item.key) }"
                        @click="toggleComponentCard(item.key)"
                    >
                        {{ item.shortName }}
                    </button>
                </div>

                <div class="agv-info-grid">
                    <article class="glass-card agv-info-card" @click.stop>
                        <div class="agv-panel-title">基本信息卡</div>
                        <div class="agv-stat-list">
                            <div class="agv-stat-row" v-for="item in basicInfoList" :key="item.label">
                                <span class="agv-stat-label">{{ item.label }}</span>
                                <strong class="agv-stat-value">{{ item.value }}</strong>
                            </div>
                        </div>
                    </article>

                    <article class="glass-card agv-info-card" @click.stop>
                        <div class="agv-panel-title">实时状态卡</div>
                        <div class="agv-status-grid">
                            <div class="agv-kv-block" v-for="item in realtimeInfoList" :key="item.key">
                                <span class="agv-kv-label">{{ item.label }}</span>
                                <strong class="agv-kv-value" :class="{ 'data-pulse': pulseMap[item.key] }">{{ item.value }}</strong>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <div
                v-for="(component, index) in openComponents"
                :key="component.key"
                :ref="'floatingCard-' + component.key"
                class="glass-card agv-floating-card"
                :class="{ dragging: dragState.active && dragState.cardKey === component.key }"
                :style="floatingCardStyle(component.key, index)"
                @click.stop
            >
                <div
                    class="agv-floating-header"
                    @mousedown="startCardDrag($event, component.key)"
                >
                    <div>
                        <div class="agv-floating-title">{{ component.name }}</div>
                        <div class="agv-floating-hint">按住标题栏拖动</div>
                    </div>
                    <button class="agv-floating-close" @click="closeFloatingCard(component.key)">×</button>
                </div>
                <div class="agv-floating-body">
                    <div class="agv-floating-section">
                        <span class="agv-floating-label">核心参数</span>
                        <div class="agv-floating-pairs">
                            <div class="agv-floating-pair" v-for="item in component.params" :key="item.label">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="agv-floating-section">
                        <span class="agv-floating-label">当前状态</span>
                        <div class="agv-floating-status-row">
                            <span class="agv-state-dot" :class="componentStateClass(component.state)"></span>
                            <strong>{{ component.statusText }}</strong>
                        </div>
                    </div>
                    <div class="agv-floating-section">
                        <span class="agv-floating-label">健康指标</span>
                        <div class="agv-floating-health">
                            <strong>{{ component.health }}%</strong>
                            <span>{{ component.alarm }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            lastUpdateTime: '--:--:--',
            sceneLoading: true,
            sceneNote: '',
            agvInfo: {
                id: '--',
                model: '--',
                taskStatus: '—',
                mode: 'auto',
                serialNo: '--',
                location: '--',
                runtime: '--'
            },
            realtimeStatus: {
                battery: 0,
                speed: 0,
                location: '--',
                heading: '--',
                mode: '--',
                signal: '--',
                runtime: '--'
            },
            pulseMap: {},
            componentCatalog: JSON.parse(JSON.stringify(AGV_COMPONENT_META)),
            openComponentKeys: [],
            activeComponentKey: '',
            hoverTag: {
                visible: false,
                label: '',
                x: 0,
                y: 0
            },
            floatingCardPositions: {},
            dragState: {
                active: false,
                cardKey: '',
                offsetX: 0,
                offsetY: 0
            },
            hoveredComponentKey: '',
            suppressBlankClickUntil: 0,
            realtimeTimer: null,
            agvPollingTimer: null,
            sceneReady: false,
            pointerDownInfo: null,
            mainShadowLight: null,
            activeAgvId: '',
            activeRequestId: 0,
            apiDataReady: false,
            /** 由地图监控跳转并写入快照时为 true，实时模拟不覆盖这些字段 */
            mapNavApplied: false,
            agvSharedUnsubscribe: null
        };
    },

    watch: {
        '$route'() {
            this.handleRouteChange();
        }
    },

    computed: {
        componentList() {
            return Object.values(this.componentCatalog);
        },

        basicInfoList() {
            return [
                { label: '编号', value: this.agvInfo.id },
                { label: '型号', value: this.agvInfo.model },
                { label: '当前任务状态', value: this.agvInfo.taskStatus },
                { label: '序列号', value: this.agvInfo.serialNo },
                { label: '当前位置', value: this.agvInfo.location }
            ];
        },

        realtimeInfoList() {
            return [
                { key: 'battery', label: '电量', value: this.realtimeStatus.battery + '%' },
                { key: 'speed', label: '速度', value: this.realtimeStatus.speed.toFixed(2) + ' m/s' },
                { key: 'location', label: '位置', value: this.realtimeStatus.location },
                { key: 'heading', label: '朝向', value: this.realtimeStatus.heading },
                { key: 'mode', label: '模式', value: this.realtimeStatus.mode },
                { key: 'signal', label: '通信质量', value: this.realtimeStatus.signal },
                { key: 'runtime', label: '运行时间', value: this.realtimeStatus.runtime }
            ];
        },

        modeLabel() {
            const meta = AGV_STATUS_META[this.agvInfo.mode] || AGV_STATUS_META.auto;
            return meta.label;
        },

        statusPillStyle() {
            const meta = AGV_STATUS_META[this.agvInfo.mode] || AGV_STATUS_META.auto;
            return {
                color: meta.color,
                borderColor: this.toAlphaColor(meta.color, 0.26),
                background: this.toAlphaColor(meta.color, 0.14)
            };
        },

        openComponents() {
            return this.openComponentKeys
                .map((key) => this.componentCatalog[key])
                .filter(Boolean);
        },

        activeComponent() {
            return this.activeComponentKey ? this.componentCatalog[this.activeComponentKey] : null;
        }
    },

    mounted() {
        this.agvSharedUnsubscribe = variables.AGV_SHARED_STATE.subscribe((snapshot) => {
            this.handleSharedAgvSnapshot(snapshot);
        });
        this.handleRouteChange();
        this.initScene();
        this.startRealtimeTick();
        this.dragMoveHandler = (event) => this.handleCardDrag(event);
        this.dragUpHandler = () => this.stopCardDrag();
        window.addEventListener('mousemove', this.dragMoveHandler);
        window.addEventListener('mouseup', this.dragUpHandler);
    },

    beforeUnmount() {
        if (this.agvSharedUnsubscribe) {
            this.agvSharedUnsubscribe();
            this.agvSharedUnsubscribe = null;
        }
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
        }
        if (this.agvPollingTimer) {
            clearInterval(this.agvPollingTimer);
        }
        window.removeEventListener('mousemove', this.dragMoveHandler);
        window.removeEventListener('mouseup', this.dragUpHandler);
        this.cleanupScene();
    },

    methods: {
        async handleRouteChange() {
            this.stopAgvPolling();
            this.applyMapNavigationPayload();
            this.applySharedAgvDetail(this.getRouteAgvId());
            await this.loadAgvFromApi();
        },

        getRouteAgvId() {
            const qid = this.$route && this.$route.query ? this.$route.query.id : '';
            return qid !== undefined && qid !== null && String(qid) !== '' ? String(qid) : '';
        },

        applyMapNavigationPayload() {
            const qid = this.$route.query.id;
            if (qid === undefined || qid === null || String(qid) === '') {
                this.mapNavApplied = false;
                return;
            }

            let raw = '';
            try {
                raw = sessionStorage.getItem(variables.MAP_AGV_NAV_STORAGE_KEY) || '';
            } catch (err) {
                this.mapNavApplied = false;
                return;
            }

            if (!raw) {
                this.mapNavApplied = false;
                return;
            }

            let payload;
            try {
                payload = JSON.parse(raw);
            } catch (err) {
                this.mapNavApplied = false;
                return;
            }

            if (String(payload.id) !== String(qid)) {
                this.mapNavApplied = false;
                return;
            }

            try {
                sessionStorage.removeItem(variables.MAP_AGV_NAV_STORAGE_KEY);
            } catch (err) {
                /* ignore */
            }

            const statusToMode = {
                running: 'auto',
                idle: 'auto',
                charging: 'charging',
                error: 'manual',
                offline: 'manual'
            };
            const mode = statusToMode[payload.status] || 'auto';
            const modeRealtimeLabel = {
                auto: '自动运行',
                manual: '人工接管',
                charging: '充电中'
            };

            this.agvInfo.id = payload.name || ('AGV-' + String(payload.id).padStart(3, '0'));
            this.agvInfo.model = payload.model || this.agvInfo.model;
            this.agvInfo.taskStatus = payload.current_task_summary ? String(payload.current_task_summary) : '—';
            this.agvInfo.mode = mode;
            this.agvInfo.serialNo = 'AGC-2026-' + String(payload.id).padStart(3, '0');
            this.agvInfo.location =
                'X ' + Number(payload.position_x || 0).toFixed(1) +
                ' / Y ' + Number(payload.position_y || 0).toFixed(1);

            this.realtimeStatus.battery = Math.round(Number(payload.battery || 0));
            this.realtimeStatus.speed = Number(payload.speed != null ? payload.speed : 0);
            this.realtimeStatus.location =
                'X ' + Number(payload.position_x || 0).toFixed(1) +
                ' / Y ' + Number(payload.position_y || 0).toFixed(1);
            this.realtimeStatus.heading = Number(payload.orientation || 0).toFixed(0) + '°';
            this.realtimeStatus.mode = modeRealtimeLabel[mode] || '自动运行';
            this.realtimeStatus.signal = '--';

            this.mapNavApplied = true;
        },

        async loadAgvFromApi() {
            const requestId = Date.now();
            this.activeRequestId = requestId;

            try {
                const agvId = await this.resolveAgvId();
                if (!agvId) {
                    this.apiDataReady = false;
                    this.activeAgvId = '';
                    this.sceneNote = '未获取到 AGV 数据。';
                    this.stopAgvPolling();
                    return;
                }

                const detail = await this.fetchAgvDetail(agvId);
                if (this.activeRequestId !== requestId) {
                    return;
                }

                this.activeAgvId = String(agvId);
                this.applyAgvDetail(detail);
                this.apiDataReady = true;
                this.sceneNote = '';
                this.startAgvPolling();
            } catch (error) {
                if (this.activeRequestId !== requestId) {
                    return;
                }

                this.apiDataReady = false;
                this.stopAgvPolling();
                if (!this.mapNavApplied) {
                    this.sceneNote = 'AGV 接口不可用，未能加载实时详情。';
                }
            }
        },

        handleSharedAgvSnapshot(snapshot) {
            const list = snapshot && Array.isArray(snapshot.list) ? snapshot.list : [];
            if (!list.length) {
                return;
            }

            const targetId = this.activeAgvId || this.getRouteAgvId() || String(list[0].id || '');
            if (!targetId) {
                return;
            }

            this.applySharedAgvDetail(targetId, list);
        },

        applySharedAgvDetail(agvId, sourceList) {
            const targetId = String(agvId || '');
            if (!targetId) {
                return false;
            }

            const list = Array.isArray(sourceList) ? sourceList : variables.AGV_SHARED_STATE.getList();
            const detail = list.find((item) => String(item.id) === targetId);
            if (!detail) {
                return false;
            }

            this.activeAgvId = targetId;
            this.applyAgvDetail(detail);
            this.apiDataReady = true;
            if (!this.mapNavApplied) {
                this.sceneNote = '';
            }
            return true;
        },

        async resolveAgvId() {
            const routeId = this.getRouteAgvId();
            if (routeId) {
                return routeId;
            }

            const sharedList = variables.AGV_SHARED_STATE.getList();
            if (sharedList.length) {
                const firstSharedAgv = sharedList[0];
                return firstSharedAgv && firstSharedAgv.id !== undefined && firstSharedAgv.id !== null ? String(firstSharedAgv.id) : '';
            }

            const agvList = await this.fetchAgvList();
            if (!agvList.length) {
                return '';
            }

            const firstAgv = agvList[0];
            return firstAgv && firstAgv.id !== undefined && firstAgv.id !== null ? String(firstAgv.id) : '';
        },

        async fetchAgvList() {
            const response = await this.fetchJson('agv');
            const list = Array.isArray(response.data) ? response.data : [];
            variables.AGV_SHARED_STATE.publish(list);
            return list;
        },

        async fetchAgvDetail(agvId, forceRefresh) {
            if (!forceRefresh) {
                const sharedDetail = variables.AGV_SHARED_STATE.getById(agvId);
                if (sharedDetail) {
                    return sharedDetail;
                }
            }

            const agvList = await this.fetchAgvList();
            const detail = agvList.find((item) => String(item.id) === String(agvId));
            if (!detail) {
                throw new Error('未找到 AGV ' + agvId + ' 的实时数据');
            }
            return detail;
        },

        async fetchJson(path) {
            const response = await fetch(this.buildApiUrl(path), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('请求失败: ' + response.status + ' ' + response.statusText);
            }

            return response.json();
        },

        buildApiUrl(path) {
            const base = (variables.API_URL || '').replace(/\/+$/, '');
            const cleanPath = String(path || '').replace(/^\/+/, '');
            return base + '/' + cleanPath;
        },

        startAgvPolling() {
            this.stopAgvPolling();
            if (!this.activeAgvId) {
                return;
            }

            this.agvPollingTimer = setInterval(async () => {
                try {
                    const detail = await this.fetchAgvDetail(this.activeAgvId, true);
                    this.applyAgvDetail(detail);
                } catch (error) {
                    this.apiDataReady = false;
                    this.stopAgvPolling();
                    if (!this.mapNavApplied) {
                        this.sceneNote = 'AGV 接口不可用，已停止自动刷新。';
                    }
                }
            }, variables.AGV_POLL_INTERVAL_MS || 1000);
        },

        stopAgvPolling() {
            if (this.agvPollingTimer) {
                clearInterval(this.agvPollingTimer);
                this.agvPollingTimer = null;
            }
        },

        applyAgvDetail(payload) {
            const nextMode = payload.mode || this.mapStatusToMode(payload.status);
            this.agvInfo.id = payload.name || ('AGV-' + String(payload.id).padStart(3, '0'));
            this.agvInfo.model = payload.model || '--';
            this.agvInfo.taskStatus = payload.current_task_summary ? String(payload.current_task_summary) : '—';
            this.agvInfo.mode = nextMode || 'auto';
            this.agvInfo.serialNo = 'AGC-2026-' + String(payload.id).padStart(3, '0');
            this.agvInfo.location = this.formatLocation(payload.position_x, payload.position_y);

            this.realtimeStatus.battery = Math.round(Number(payload.battery || 0));
            this.realtimeStatus.speed = Number(payload.speed != null ? payload.speed : 0);
            this.realtimeStatus.location = this.formatLocation(payload.position_x, payload.position_y, payload.position_z);
            this.realtimeStatus.heading = Number(payload.orientation || 0).toFixed(0) + '°';
            this.realtimeStatus.mode = this.formatModeLabel(nextMode);
            this.realtimeStatus.signal = this.formatCommunicationQuality(payload.communication_quality);
            this.realtimeStatus.runtime = '--';

            ['battery', 'speed', 'location', 'heading', 'mode', 'signal', 'runtime'].forEach((key) => this.pulseField(key));
            this.patchComponentMetrics();
            this.lastUpdateTime = this.formatDisplayTime(payload.last_update);
        },

        mapStatusToMode(status) {
            const statusToMode = {
                running: 'auto',
                idle: 'auto',
                charging: 'charging',
                error: 'manual',
                offline: 'manual'
            };
            return statusToMode[status] || 'auto';
        },

        formatModeLabel(mode) {
            const modeRealtimeLabel = {
                auto: '自动运行',
                manual: '人工接管',
                charging: '充电中'
            };
            return modeRealtimeLabel[mode] || '--';
        },

        formatCommunicationQuality(value) {
            const labelMap = {
                strong: '强',
                medium: '中',
                weak: '弱',
                disconnected: '断开'
            };
            return labelMap[value] || '--';
        },

        formatLocation(x, y, z) {
            const hasZ = z !== undefined && z !== null;
            if (hasZ) {
                return (
                    'X ' + Number(x || 0).toFixed(1) +
                    ' / Y ' + Number(y || 0).toFixed(1) +
                    ' / Z ' + Number(z || 0).toFixed(1)
                );
            }

            return 'X ' + Number(x || 0).toFixed(1) + ' / Y ' + Number(y || 0).toFixed(1);
        },

        formatDisplayTime(value) {
            if (!value) {
                return '--:--:--';
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '--:--:--';
            }

            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        },

        updateTime() {
            this.lastUpdateTime = new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        },

        startRealtimeTick() {
            this.realtimeTimer = setInterval(() => {
                this.patchComponentMetrics();
            }, 1000);
        },

        patchComponentMetrics() {
            const t = Date.now();
            this.componentCatalog.chassis.params[0].value = this.realtimeStatus.speed.toFixed(2) + ' m/s';

            this.componentCatalog.arm.params[0].value = Math.abs(Math.sin(t / 2100)) > 0.65 ? '运动中' : '待命';
            this.componentCatalog.arm.params[1].value = (0.4 + Math.abs(Math.sin(t / 1900)) * 0.9).toFixed(1) + ' N';

            this.componentCatalog.lidar.params[0].value = Math.abs(Math.cos(t / 3200)) > 0.4 ? 'SLAM 已锁定' : '重定位中';
            this.componentCatalog.lidar.params[1].value = (14 + Math.round(Math.abs(Math.sin(t / 1700)) * 8)) + ' 个动态目标';

            this.componentCatalog.camera.params[0].value = Math.round(this.realtimeStatus.battery) >= 70 ? '托盘识别' : '工位定位';

            this.componentCatalog.mic.params[0].value = Math.abs(Math.sin(t / 2900)) > 0.5 ? '双通道降噪开启' : '单通道降噪';
            this.componentCatalog.mic.params[1].value = Math.abs(Math.cos(t / 3500)) > 0.35 ? '在线' : '待机';
            this.componentCatalog.mic.params[2].value = Math.abs(Math.sin(t / 2300)) > 0.55 ? '轴噪正常' : '轻微啸叫';

            this.componentCatalog.compute.params[0].value = (44 + Math.round(Math.abs(Math.sin(t / 1800)) * 8)) + '%';
            this.componentCatalog.compute.params[1].value = (5.4 + Math.abs(Math.cos(t / 2400)) * 0.6).toFixed(1) + ' / 8 GB';
            this.componentCatalog.compute.params[2].value = (56 + Math.round(Math.abs(Math.sin(t / 2600)) * 4)) + '°C';

            this.componentCatalog.battery.params[0].value = (11.9 + Math.abs(Math.cos(t / 2800)) * 0.4).toFixed(1) + ' V';
            this.componentCatalog.battery.params[1].value = Math.round(this.realtimeStatus.battery) + '%';
        },

        formatRuntime(totalSeconds) {
            const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSeconds % 60).padStart(2, '0');
            return hrs + ':' + mins + ':' + secs;
        },

        pulseField(key) {
            this.pulseMap[key] = false;
            this.$nextTick(() => {
                this.pulseMap[key] = true;
                window.setTimeout(() => {
                    this.pulseMap[key] = false;
                }, 220);
            });
        },

        componentStateClass(state) {
            return 'is-' + (state || 'normal');
        },

        handleBlankAreaClick() {
            if (Date.now() < this.suppressBlankClickUntil) {
                return;
            }
            this.closeAllFloatingCards();
        },

        handleInfoPanelClick(event) {
            if (Date.now() < this.suppressBlankClickUntil) {
                return;
            }
            if (event.target === event.currentTarget) {
                this.closeAllFloatingCards();
            }
        },

        suppressBlankClick() {
            this.suppressBlankClickUntil = Date.now() + 180;
        },

        toggleComponentCard(componentKey) {
            this.suppressBlankClick();
            const existingIndex = this.openComponentKeys.indexOf(componentKey);
            if (existingIndex !== -1) {
                this.closeFloatingCard(componentKey);
                return;
            }

            this.openComponentKeys = this.openComponentKeys.concat(componentKey);
            this.activeComponentKey = componentKey;
            this.resetFloatingCardPosition(componentKey);
            this.applySelectionState();
        },

        closeFloatingCard(componentKey) {
            this.openComponentKeys = this.openComponentKeys.filter((key) => key !== componentKey);
            if (this.activeComponentKey === componentKey) {
                this.activeComponentKey = this.openComponentKeys.length
                    ? this.openComponentKeys[this.openComponentKeys.length - 1]
                    : '';
            }
            const nextPositions = { ...this.floatingCardPositions };
            delete nextPositions[componentKey];
            this.floatingCardPositions = nextPositions;
            this.applySelectionState();
        },

        closeAllFloatingCards() {
            this.openComponentKeys = [];
            this.activeComponentKey = '';
            this.floatingCardPositions = {};
            this.dragState.active = false;
            this.dragState.cardKey = '';
            this.applySelectionState();
        },

        resetFloatingCardPosition(componentKey) {
            this.$nextTick(() => {
                const boundary = this.$refs.cardBoundary;
                const card = this.getFloatingCardElement(componentKey);
                const cardIndex = Math.max(0, this.openComponentKeys.indexOf(componentKey));
                const width = card ? card.offsetWidth : 280;
                const height = card ? card.offsetHeight : 240;
                const cascadeX = cardIndex * 24;
                const cascadeY = cardIndex * 18;
                const nextX = Math.max(16, Math.round((boundary.clientWidth - width) / 2) + cascadeX);
                const nextY = Math.max(120, Math.round((boundary.clientHeight - height) / 2) + cascadeY);
                this.floatingCardPositions = {
                    ...this.floatingCardPositions,
                    [componentKey]: { x: nextX, y: nextY }
                };
            });
        },

        floatingCardStyle(componentKey, index) {
            const position = this.floatingCardPositions[componentKey] || {
                x: 36 + index * 24,
                y: 180 + index * 18
            };
            return {
                left: position.x + 'px',
                top: position.y + 'px',
                zIndex: this.activeComponentKey === componentKey ? 12 : 6 + index
            };
        },

        startCardDrag(event, componentKey) {
            if (this.openComponentKeys.indexOf(componentKey) === -1) {
                return;
            }
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            this.suppressBlankClick();
            this.activeComponentKey = componentKey;
            this.applySelectionState();
            const card = this.getFloatingCardElement(componentKey);
            if (!card) {
                return;
            }
            const rect = card.getBoundingClientRect();
            this.dragState.active = true;
            this.dragState.cardKey = componentKey;
            this.dragState.offsetX = event.clientX - rect.left;
            this.dragState.offsetY = event.clientY - rect.top;
        },

        handleCardDrag(event) {
            if (!this.dragState.active || !this.dragState.cardKey) {
                return;
            }
            const boundary = this.$refs.cardBoundary;
            const card = this.getFloatingCardElement(this.dragState.cardKey);
            if (!boundary || !card) {
                return;
            }

            const boundaryRect = boundary.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            const maxX = Math.max(16, boundary.clientWidth - cardRect.width - 16);
            const maxY = Math.max(16, boundary.clientHeight - cardRect.height - 16);
            const nextX = event.clientX - boundaryRect.left - this.dragState.offsetX;
            const nextY = event.clientY - boundaryRect.top - this.dragState.offsetY;

            this.floatingCardPositions = {
                ...this.floatingCardPositions,
                [this.dragState.cardKey]: {
                    x: Math.min(Math.max(16, nextX), maxX),
                    y: Math.min(Math.max(16, nextY), maxY)
                }
            };
        },

        stopCardDrag() {
            this.dragState.active = false;
            this.dragState.cardKey = '';
        },

        getFloatingCardElement(componentKey) {
            const refValue = this.$refs['floatingCard-' + componentKey];
            return Array.isArray(refValue) ? refValue[0] : refValue;
        },

        initScene() {
            this.cleanupScene();

            const viewport = this.$refs.modelViewport;
            if (!viewport || !window.THREE || !window.THREE.OrbitControls) {
                this.sceneLoading = false;
                this.sceneNote = 'Three.js 依赖缺失，无法渲染 3D 模型。';
                return;
            }

            const width = viewport.clientWidth || 760;
            const height = viewport.clientHeight || 640;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1200);
            this.camera.position.set(0, 2.2, 5.6);

            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(width, height);
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            viewport.appendChild(this.renderer.domElement);

            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.minDistance = 1.4;
            this.controls.maxDistance = 12;
            this.controls.target.set(0, 0, 0);
            this.controls.update();

            this.raycaster = new THREE.Raycaster();
            this.pointer = new THREE.Vector2();
            this.pickableObjects = [];
            this.componentObjects = {};

            // 环境光：均匀提亮整体，减轻背光面死黑
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
            // 半球环境：天空/地面色轻微渐变（与下方平行光叠加）
            const hemiLight = new THREE.HemisphereLight(0xc7d9ff, 0x223248, 0.72);
            // 主平行光：斜上方主方向照明，并投射阴影（辅光不投影，避免重影）
            const mainParallelLight = new THREE.DirectionalLight(0xffffff, 1.35);
            mainParallelLight.position.set(6, 10, 8);
            mainParallelLight.castShadow = true;
            mainParallelLight.shadow.mapSize.set(2048, 2048);
            mainParallelLight.shadow.bias = -0.0002;
            mainParallelLight.shadow.normalBias = 0.035;
            this.mainShadowLight = mainParallelLight;
            this.scene.add(mainParallelLight.target);
            mainParallelLight.target.position.set(0, 0, 0);
            // 辅平行光：对侧补光，柔化明暗对比
            const fillParallelLight = new THREE.DirectionalLight(0xe8eff8, 0.58);
            fillParallelLight.position.set(-5, 6, -7);
            fillParallelLight.castShadow = false;
            this.scene.add(fillParallelLight.target);
            fillParallelLight.target.position.set(0, 0, 0);

            this.modelRoot = new THREE.Group();
            this.scene.add(ambientLight, hemiLight, mainParallelLight, fillParallelLight, this.modelRoot);
            this.bindSceneEvents();
            this.renderLoop();
            this.loadModelAsset();
        },

        bindSceneEvents() {
            const canvas = this.renderer.domElement;
            this.boundResize = () => this.handleSceneResize();
            this.boundPointerMove = (event) => this.handlePointerMove(event);
            this.boundPointerLeave = () => this.handlePointerLeave();
            this.boundPointerDown = (event) => this.handlePointerDown(event);
            this.boundPointerUp = (event) => this.handlePointerUp(event);

            window.addEventListener('resize', this.boundResize);
            canvas.addEventListener('pointermove', this.boundPointerMove);
            canvas.addEventListener('pointerleave', this.boundPointerLeave);
            canvas.addEventListener('pointerdown', this.boundPointerDown);
            canvas.addEventListener('pointerup', this.boundPointerUp);
        },

        loadModelAsset() {
            if (!window.THREE.GLTFLoader) {
                this.sceneLoading = false;
                this.sceneNote = 'GLTFLoader 未加载，已切换为示意模型。';
                this.mountFallbackModel();
                return;
            }

            const loader = new THREE.GLTFLoader();
            loader.load(
                variables.AGVCAR_MODEL_URL,
                (gltf) => {
                    const model = gltf.scene || gltf.scenes[0];
                    this.prepareModel(model);
                    this.sceneLoading = false;
                    this.sceneReady = true;
                },
                undefined,
                () => {
                    this.sceneLoading = false;
                    this.sceneNote = '原始 GLB 模型加载失败，已使用示意模型保持交互流程。';
                    this.mountFallbackModel();
                    this.sceneReady = true;
                }
            );
        },

        prepareModel(model) {
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxAxis = Math.max(size.x, size.y, size.z) || 1;
            const scale = 2.8 / maxAxis;

            model.scale.setScalar(scale);
            const boxScaled = new THREE.Box3().setFromObject(model);
            const centerScaled = boxScaled.getCenter(new THREE.Vector3());
            model.position.sub(centerScaled);
            const boxGround = new THREE.Box3().setFromObject(model);
            model.position.y -= boxGround.min.y;

            model.traverse((node) => {
                if (!node.isMesh) {
                    return;
                }
                node.material = this.cloneMaterial(node.material);
                node.castShadow = true;
                node.receiveShadow = true;
                this.addMeshEdgeLines(node);
            });

            this.modelRoot.add(model);
            this.modelScene = model;
            this.buildComponentBindings(model);
            this.createFallbackHotspotsIfNeeded(model);
            this.frameModelScene(model);
            this.configureShadowCameraForModel();
        },

        mountFallbackModel() {
            const group = new THREE.Group();

            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 0.7, 1.7),
                new THREE.MeshPhongMaterial({ color: 0x90a8cf, shininess: 40 })
            );
            body.position.y = 0.2;
            group.add(body);

            const armBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.22, 0.38, 24),
                new THREE.MeshPhongMaterial({ color: 0x58698c })
            );
            armBase.position.set(0.15, 0.72, 0);
            group.add(armBase);

            const arm = new THREE.Group();
            const armLink1 = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.85, 0.22),
                new THREE.MeshPhongMaterial({ color: 0x7aa2d6 })
            );
            armLink1.position.set(0, 1.08, 0);
            const armLink2 = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.72, 0.16),
                new THREE.MeshPhongMaterial({ color: 0xbad1f2 })
            );
            armLink2.position.set(0.28, 1.48, 0.24);
            arm.add(armLink1, armLink2);
            group.add(arm);

            const lidar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.18, 0.16, 24),
                new THREE.MeshPhongMaterial({ color: 0x4a90d9 })
            );
            lidar.position.set(-0.48, 0.72, -0.18);
            group.add(lidar);

            const camera = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.18, 0.18),
                new THREE.MeshPhongMaterial({ color: 0x283a57 })
            );
            camera.position.set(0.92, 0.68, 0.6);
            group.add(camera);

            const battery = new THREE.Mesh(
                new THREE.BoxGeometry(0.48, 0.26, 0.3),
                new THREE.MeshPhongMaterial({ color: 0x1b2e46 })
            );
            battery.position.set(-0.55, 0.14, 0.35);
            group.add(battery);

            const compute = new THREE.Mesh(
                new THREE.BoxGeometry(0.52, 0.14, 0.36),
                new THREE.MeshPhongMaterial({ color: 0x415b86 })
            );
            compute.position.set(0.58, 0.54, -0.28);
            group.add(compute);

            const mic = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 18, 18),
                new THREE.MeshPhongMaterial({ color: 0xc8d9f7 })
            );
            mic.position.set(0.02, 0.86, 0.76);
            group.add(mic);

            group.traverse((node) => {
                if (node.isMesh) {
                    node.material = this.cloneMaterial(node.material);
                    node.castShadow = true;
                    node.receiveShadow = true;
                    this.addMeshEdgeLines(node);
                }
            });

            this.modelRoot.add(group);
            this.modelScene = group;
            this.buildComponentBindings(group);
            this.createFallbackHotspotsIfNeeded(group);
            this.frameModelScene(group);
            this.configureShadowCameraForModel();
        },

        frameModelScene(object) {
            if (!object || !this.camera || !this.controls) {
                return;
            }

            const box = new THREE.Box3().setFromObject(object);
            if (box.isEmpty()) {
                return;
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const span = Math.max(size.x, size.y, size.z, 0.8);
            const target = new THREE.Vector3(center.x, box.min.y + size.y * 0.35, center.z);

            const cameraPosition = new THREE.Vector3(
                target.x + span * 1.15,
                target.y + span * 0.62,
                target.z + span * 1.58
            );

            this.defaultCameraState = {
                target,
                position: cameraPosition
            };

            this.camera.position.copy(cameraPosition);
            this.controls.target.copy(target);
            this.controls.update();
        },

        configureShadowCameraForModel() {
            const light = this.mainShadowLight;
            if (!light || !this.modelRoot) {
                return;
            }
            const box = new THREE.Box3().setFromObject(this.modelRoot);
            if (box.isEmpty()) {
                return;
            }
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 0.5);
            const extent = maxDim * 2.8;
            const cam = light.shadow.camera;
            cam.left = -extent;
            cam.right = extent;
            cam.top = extent;
            cam.bottom = -extent;
            cam.near = 0.2;
            cam.far = maxDim * 12;
            cam.updateProjectionMatrix();
        },

        meshMatchesRoundedEdgeKeywords(mesh) {
            const parts = [];
            let node = mesh;
            let depth = 0;
            while (node && depth < 12) {
                if (node.name) {
                    parts.push(String(node.name));
                }
                node = node.parent;
                depth += 1;
            }
            const blob = parts.join(' ');
            const lower = blob.toLowerCase();
            for (let i = 0; i < AGV_EDGE_ROUNDED_NAME_KEYWORDS.length; i += 1) {
                const kw = AGV_EDGE_ROUNDED_NAME_KEYWORDS[i];
                if (/[^\x00-\x7f]/.test(kw)) {
                    if (blob.indexOf(kw) !== -1) {
                        return true;
                    }
                } else if (lower.indexOf(kw.toLowerCase()) !== -1) {
                    return true;
                }
            }
            return false;
        },

        addMeshEdgeLines(mesh) {
            const THREE = window.THREE;
            if (!mesh || !mesh.geometry) {
                return;
            }
            const geom = mesh.geometry;
            if (geom.isInstancedBufferGeometry || !geom.attributes || !geom.attributes.position) {
                return;
            }
            const thresholdDeg = this.meshMatchesRoundedEdgeKeywords(mesh)
                ? AGV_EDGE_THRESHOLD_ROUNDED_PART
                : AGV_EDGE_THRESHOLD_DEFAULT;
            let edgeGeom;
            try {
                edgeGeom = new THREE.EdgesGeometry(geom, thresholdDeg);
            } catch (e) {
                return;
            }
            if (!edgeGeom.attributes.position || edgeGeom.attributes.position.count === 0) {
                edgeGeom.dispose();
                return;
            }
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x1b2a3f,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const lines = new THREE.LineSegments(edgeGeom, lineMat);
            lines.userData.isEdgeOverlay = true;
            lines.renderOrder = 1;
            mesh.add(lines);
        },

        cloneMaterial(material) {
            if (Array.isArray(material)) {
                return material.map((item) => item && item.clone ? item.clone() : item);
            }
            return material && material.clone ? material.clone() : material;
        },

        buildComponentBindings(model) {
            this.componentObjects = {};
            Object.keys(this.componentCatalog).forEach((key) => {
                this.componentObjects[key] = [];
            });

            model.traverse((node) => {
                if (!node.isMesh) {
                    return;
                }
                const componentKey = this.matchComponentByName(node);
                if (componentKey) {
                    node.userData.componentKey = componentKey;
                    this.componentObjects[componentKey].push(node);
                    this.pickableObjects.push(node);
                }
            });
        },

        matchComponentByName(node) {
            const candidateNames = this.getComponentCandidateNames(node);
            for (let index = 0; index < candidateNames.length; index += 1) {
                const exactMatch = AGV_COMPONENT_NAME_MAP[candidateNames[index]];
                if (exactMatch) {
                    return exactMatch;
                }
            }

            const keys = Object.keys(this.componentCatalog);
            for (let index = 0; index < keys.length; index += 1) {
                const key = keys[index];
                const matched = candidateNames.some((candidateName) => {
                    return this.componentCatalog[key].keywords.some((keyword) => candidateName.indexOf(keyword.toLowerCase()) !== -1);
                });
                if (matched) {
                    return key;
                }
            }
            return '';
        },

        getComponentCandidateNames(node) {
            const names = [];
            let current = node;
            while (current) {
                const normalizedName = this.normalizeComponentNodeName(current.name);
                if (normalizedName && names.indexOf(normalizedName) === -1) {
                    names.push(normalizedName);
                }
                current = current.parent;
            }
            return names;
        },

        normalizeComponentNodeName(name) {
            return String(name || '').trim().toLowerCase();
        },

        createFallbackHotspotsIfNeeded(model) {
            const worldBox = new THREE.Box3().setFromObject(model);
            const size = worldBox.getSize(new THREE.Vector3());
            const center = worldBox.getCenter(new THREE.Vector3());
            const hotspotConfigs = {
                chassis: { offset: [0, -size.y * 0.16, 0], scale: [size.x * 0.92, Math.max(size.y * 0.28, 0.24), size.z * 0.92] },
                arm: { offset: [size.x * 0.12, size.y * 0.3, 0], scale: [Math.max(size.x * 0.24, 0.18), Math.max(size.y * 0.54, 0.4), Math.max(size.z * 0.22, 0.18)] },
                lidar: { offset: [-size.x * 0.18, size.y * 0.28, -size.z * 0.2], scale: [0.28, 0.22, 0.28] },
                camera: { offset: [size.x * 0.32, size.y * 0.2, size.z * 0.28], scale: [0.34, 0.24, 0.26] },
                mic: { offset: [0, size.y * 0.34, size.z * 0.34], scale: [0.22, 0.2, 0.22] },
                compute: { offset: [size.x * 0.2, size.y * 0.1, -size.z * 0.12], scale: [Math.max(size.x * 0.22, 0.24), Math.max(size.y * 0.14, 0.16), Math.max(size.z * 0.2, 0.18)] },
                battery: { offset: [-size.x * 0.2, -size.y * 0.02, size.z * 0.16], scale: [Math.max(size.x * 0.24, 0.24), Math.max(size.y * 0.18, 0.18), Math.max(size.z * 0.18, 0.18)] }
            };

            Object.keys(hotspotConfigs).forEach((key) => {
                const hasObjects = this.componentObjects[key] && this.componentObjects[key].length > 0;
                if (hasObjects) {
                    return;
                }

                const config = hotspotConfigs[key];
                const hotspot = new THREE.Mesh(
                    new THREE.BoxGeometry(config.scale[0], config.scale[1], config.scale[2]),
                    new THREE.MeshPhongMaterial({
                        color: 0x4a90d9,
                        transparent: true,
                        opacity: 0.02
                    })
                );
                hotspot.position.set(
                    center.x + config.offset[0],
                    center.y + config.offset[1],
                    center.z + config.offset[2]
                );
                hotspot.userData.componentKey = key;
                hotspot.userData.isHotspot = true;
                hotspot.castShadow = false;
                hotspot.receiveShadow = false;
                this.modelRoot.add(hotspot);
                this.componentObjects[key].push(hotspot);
                this.pickableObjects.push(hotspot);
            });
        },

        renderLoop() {
            const animate = () => {
                this.animationFrame = window.requestAnimationFrame(animate);
                if (this.modelRoot) {
                    const t = Date.now() * 0.001;
                    this.modelRoot.position.y = Math.sin(t * 0.8) * 0.03;
                }
                if (this.controls) {
                    this.controls.update();
                }
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            };
            animate();
        },

        handleSceneResize() {
            if (!this.renderer || !this.camera || !this.$refs.modelViewport) {
                return;
            }
            const width = this.$refs.modelViewport.clientWidth || 760;
            const height = this.$refs.modelViewport.clientHeight || 640;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        },

        handlePointerDown(event) {
            this.pointerDownInfo = {
                x: event.clientX,
                y: event.clientY
            };
        },

        handlePointerUp(event) {
            if (!this.pointerDownInfo) {
                return;
            }
            const movedX = Math.abs(event.clientX - this.pointerDownInfo.x);
            const movedY = Math.abs(event.clientY - this.pointerDownInfo.y);
            this.pointerDownInfo = null;
            if (movedX > 4 || movedY > 4) {
                return;
            }

            const picked = this.pickComponent(event);
            if (picked) {
                this.toggleComponentCard(picked);
            } else {
                this.closeAllFloatingCards();
            }
        },

        handlePointerMove(event) {
            const componentKey = this.pickComponent(event);
            if (!componentKey) {
                this.hoverTag.visible = false;
                this.hoveredComponentKey = '';
                this.applySelectionState();
                this.renderer.domElement.style.cursor = 'default';
                return;
            }

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.hoverTag.visible = true;
            this.hoverTag.label = this.componentCatalog[componentKey].name;
            this.hoverTag.x = Math.min(event.clientX - rect.left + 18, rect.width - 160);
            this.hoverTag.y = Math.min(event.clientY - rect.top + 18, rect.height - 50);
            this.hoveredComponentKey = componentKey;
            this.applySelectionState();
            this.renderer.domElement.style.cursor = 'pointer';
        },

        handlePointerLeave() {
            this.hoverTag.visible = false;
            this.hoveredComponentKey = '';
            this.applySelectionState();
            if (this.renderer && this.renderer.domElement) {
                this.renderer.domElement.style.cursor = 'default';
            }
        },

        pickComponent(event) {
            if (!this.camera || !this.raycaster || !this.pickableObjects.length) {
                return '';
            }
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.pickableObjects, false);
            if (!intersects.length) {
                return '';
            }
            return intersects[0].object.userData.componentKey || '';
        },

        applySelectionState() {
            Object.keys(this.componentObjects).forEach((componentKey) => {
                const isOpen = this.openComponentKeys.indexOf(componentKey) !== -1;
                const isActive = isOpen || componentKey === this.hoveredComponentKey;
                const isFocused = componentKey === this.activeComponentKey;
                (this.componentObjects[componentKey] || []).forEach((object) => {
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    materials.forEach((material) => {
                        if (!material) {
                            return;
                        }
                        if ('emissive' in material && material.emissive) {
                            material.emissive.setHex(isActive ? 0x285c99 : 0x000000);
                            material.emissiveIntensity = isFocused ? 0.95 : (isActive ? 0.55 : 0);
                        }
                        if (object.userData.isHotspot) {
                            material.opacity = isFocused ? 0.22 : (isActive ? 0.12 : 0.02);
                        }
                    });
                });
            });
        },

        resetCamera() {
            if (!this.camera || !this.controls) {
                return;
            }
            if (this.defaultCameraState) {
                this.camera.position.copy(this.defaultCameraState.position);
                this.controls.target.copy(this.defaultCameraState.target);
            } else {
                this.camera.position.set(0, 2.2, 5.6);
                this.controls.target.set(0, 0, 0);
            }
            this.controls.update();
            this.suppressBlankClick();
        },

        focusSelectedPart() {
            const componentKey = this.activeComponentKey;
            if (!componentKey || !this.controls || !this.camera || !this.componentObjects[componentKey] || !this.componentObjects[componentKey].length) {
                return;
            }
            const box = new THREE.Box3();
            this.componentObjects[componentKey].forEach((item) => box.expandByObject(item));
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const distance = Math.max(size.x, size.y, size.z, 0.5) * 3.2;
            this.controls.target.copy(center);
            this.camera.position.set(center.x + distance, center.y + distance * 0.7, center.z + distance);
            this.controls.update();
            this.suppressBlankClick();
        },

        toAlphaColor(hexColor, alpha) {
            const clean = String(hexColor || '').replace('#', '');
            const full = clean.length === 3
                ? clean.split('').map((char) => char + char).join('')
                : clean;
            const value = parseInt(full, 16);
            const r = (value >> 16) & 255;
            const g = (value >> 8) & 255;
            const b = value & 255;
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
        },

        cleanupScene() {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            if (this.renderer && this.renderer.domElement) {
                const canvas = this.renderer.domElement;
                if (this.boundPointerMove) canvas.removeEventListener('pointermove', this.boundPointerMove);
                if (this.boundPointerLeave) canvas.removeEventListener('pointerleave', this.boundPointerLeave);
                if (this.boundPointerDown) canvas.removeEventListener('pointerdown', this.boundPointerDown);
                if (this.boundPointerUp) canvas.removeEventListener('pointerup', this.boundPointerUp);
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
            }
            if (this.boundResize) {
                window.removeEventListener('resize', this.boundResize);
            }
            if (this.controls) {
                this.controls.dispose();
            }
            if (this.scene) {
                this.scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) => material && material.dispose && material.dispose());
                        } else if (object.material.dispose) {
                            object.material.dispose();
                        }
                    }
                });
            }
            if (this.renderer) {
                this.renderer.dispose();
            }
            this.mainShadowLight = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.raycaster = null;
            this.pointer = null;
            this.modelScene = null;
            this.modelRoot = null;
            this.pickableObjects = [];
            this.componentObjects = {};
            this.hoveredComponentKey = '';
        }
    }
};

window.agv = agv;
