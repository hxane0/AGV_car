/** GLB 网格不参与射线检测，仅用于拾取盒 */
function mapAgvEmptyRaycast() {}

const MAP_STATUS_META = {
    running: { label: '运行中', color: '#52c41a' },
    idle: { label: '待机', color: '#13c2c2' },
    charging: { label: '充电中', color: '#fa8c16' },
    error: { label: '故障', color: '#f5222d' },
    offline: { label: '离线', color: '#8c8c8c' }
};

const map = {
    template: `
    <div class="map-page">
        <div class="page-title-bar map-page-title">
            <div>
                <div class="page-title">地图监控</div>
                <div class="page-subtitle">三维实时场景监控 AGV 位置、状态与规划路径</div>
            </div>
            <div class="map-page-meta">
                <span class="map-connection-pill" :class="connectionBadgeClass">{{ connectionLabel }}</span>
                <span>最后更新: {{ lastUpdateTime }}</span>
            </div>
        </div>

        <div class="map-scene-shell">
            <div ref="viewport" class="map-viewport"></div>

            <div v-if="loading" class="map-overlay map-overlay-loading">
                <div class="map-overlay-card">
                    <div class="map-overlay-title">正在初始化三维场景</div>
                    <div class="map-overlay-text">加载地图载体、AGV 实例与交互控件...</div>
                </div>
            </div>

            <div v-if="errorMessage && !loading" class="map-overlay map-overlay-error">
                <div class="map-overlay-card">
                    <div class="map-overlay-title">地图监控加载失败</div>
                    <div class="map-overlay-text">{{ errorMessage }}</div>
                    <button class="map-action-btn primary" @click="retryLoad">重新加载</button>
                </div>
            </div>

            <div v-if="!loading && !errorMessage && agvs.length === 0" class="map-overlay map-overlay-empty">
                <div class="map-overlay-card">
                    <div class="map-overlay-title">暂无 AGV 数据</div>
                    <div class="map-overlay-text">当前没有可展示的小车位姿信息。</div>
                </div>
            </div>

            <div class="map-toolbar glass-card">
                <button class="map-action-btn" @click="resetCamera">重置视角</button>
                <button class="map-action-btn" @click="fitAllAgvs">适合全部 AGV</button>
            </div>

            <div class="map-legend glass-card">
                <div class="map-legend-title">场景说明</div>
                <div class="map-legend-grid">
                    <div class="map-legend-item" v-for="item in statusLegend" :key="item.status">
                        <span class="map-status-dot" :style="{ backgroundColor: item.color }"></span>
                        <span>{{ item.label }}</span>
                        <span class="map-legend-count">{{ item.count }}</span>
                    </div>
                </div>
                <div class="map-legend-hint">Hover 查看简报，右键切换规划路径，左键单击进入第三人称视角，左键双击进入 AGV 管理详情。</div>
            </div>

            <div
                v-if="tooltip.visible && tooltip.agv"
                class="map-tooltip glass-card"
                :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
            >
                <div class="map-tooltip-header">
                    <div>
                        <div class="map-tooltip-title">{{ tooltip.agv.name }}</div>
                        <div class="map-tooltip-subtitle">ID {{ tooltip.agv.id }} · {{ tooltip.agv.model || '标准立方体' }}</div>
                    </div>
                    <span
                        class="map-status-badge"
                        :style="getStatusBadgeStyle(tooltip.agv.status)"
                    >
                        {{ getStatusMeta(tooltip.agv.status).label }}
                    </span>
                </div>
                <div class="map-tooltip-row">
                    <span>当前任务</span>
                    <strong>{{ tooltip.agv.current_task_summary || '暂无任务' }}</strong>
                </div>
                <div class="map-tooltip-row">
                    <span>坐标</span>
                    <strong>{{ formatCoordinate(tooltip.agv) }}</strong>
                </div>
                <div class="map-tooltip-row">
                    <span>电量</span>
                    <strong>{{ Math.round(tooltip.agv.battery) }}%</strong>
                </div>
                <div class="map-battery-track">
                    <div class="map-battery-fill" :style="getBatteryStyle(tooltip.agv.battery)"></div>
                </div>
            </div>

            <div v-if="toast.visible" class="map-toast glass-card">
                {{ toast.message }}
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            loading: true,
            errorMessage: '',
            lastUpdateTime: '--:--:--',
            connectionState: variables.SIMULATION_MODE ? 'simulation' : 'connecting',
            agvDataMode: variables.SIMULATION_MODE ? 'simulation' : 'api',
            mapConfig: null,
            agvs: [],
            tooltip: {
                visible: false,
                x: 0,
                y: 0,
                agv: null
            },
            toast: {
                visible: false,
                message: ''
            },
            pathVisibility: {},
            pathData: {},
            pointerDownInfo: null,
            mockTimer: null,
            ws: null,
            wsReconnectTimer: null,
            wsPingTimer: null,
            pollingTimer: null,
            toastTimer: null
        };
    },

    created() {
        this.resetSceneRuntime();
    },

    computed: {
        connectionLabel() {
            const labels = {
                simulation: '模拟数据',
                connecting: '正在连接',
                connected: '实时连接',
                reconnecting: '重连中',
                polling: '轮询模式',
                disconnected: '已断开'
            };
            return labels[this.connectionState] || '未知状态';
        },

        connectionBadgeClass() {
            return 'is-' + this.connectionState;
        },

        statusLegend() {
            return Object.keys(MAP_STATUS_META).map((status) => {
                const meta = MAP_STATUS_META[status];
                return {
                    status,
                    label: meta.label,
                    color: meta.color,
                    count: this.agvs.filter((agv) => agv.status === status).length
                };
            });
        }
    },

    mounted() {
        this.retryLoad();
    },

    beforeUnmount() {
        this.cleanupRealtime();
        this.cleanupScene();
        if (this.agvModelTemplate) {
            this.disposeObject(this.agvModelTemplate);
            this.agvModelTemplate = null;
        }
        this.agvModelLoadPromise = null;
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }
    },

    methods: {
        resetSceneRuntime() {
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.raycaster = null;
            this.pointer = null;
            this.plateMesh = null;
            this.agvGroup = null;
            this.pathGroup = null;
            this.agvMeshes = {};
            this.pathMeshes = {};
            this.pickableMeshes = [];
            this.agvModelTemplate = null;
            this.agvModelLoadPromise = null;
            this.animationFrame = null;
            this.resizeHandler = null;
            this.sceneEventHandlers = null;
            this.followAgvId = null;
            this.followCameraTarget = null;
        },

        async retryLoad() {
            this.loading = true;
            this.errorMessage = '';
            this.tooltip.visible = false;
            this.cleanupRealtime();
            this.cleanupScene();

            try {
                this.assertThreeSupport();
                this.initScene();
                await this.loadInitialData();
                this.loading = false;

                if (this.agvDataMode === 'simulation') {
                    this.startMockRealtime();
                } else {
                    this.connectAgvStatus();
                }
            } catch (error) {
                this.loading = false;
                this.errorMessage = error && error.message ? error.message : '未知错误';
                this.connectionState = 'disconnected';
            }
        },

        assertThreeSupport() {
            if (!window.THREE) {
                throw new Error('Three.js 依赖未加载，无法渲染三维地图。');
            }
            if (!window.THREE.OrbitControls) {
                throw new Error('OrbitControls 未加载，无法启用视角交互。');
            }
        },

        initScene() {
            const viewport = this.$refs.viewport;
            if (!viewport) {
                throw new Error('未找到地图视口容器。');
            }

            const width = viewport.clientWidth || 1200;
            const height = viewport.clientHeight || 720;

            this.scene = new THREE.Scene();
            this.scene.background = null;

            this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 5000);
            this.camera.position.set(60, 80, 90);

            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(width, height);
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            viewport.appendChild(this.renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
            const hemiLight = new THREE.HemisphereLight(0x9bb5ff, 0x0b0f18, 0.75);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
            directionalLight.position.set(80, 120, 40);
            this.scene.add(ambientLight, hemiLight, directionalLight);

            this.agvGroup = new THREE.Group();
            this.pathGroup = new THREE.Group();
            this.scene.add(this.agvGroup, this.pathGroup);

            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.minDistance = 18;
            this.controls.maxDistance = 520;
            this.controls.maxPolarAngle = Math.PI / 2.02;
            this.controls.enablePan = true;
            this.controls.target.set(50, 0, 40);

            this.raycaster = new THREE.Raycaster();
            this.pointer = new THREE.Vector2();

            this.bindSceneEvents();
            this.renderLoop();
        },

        bindSceneEvents() {
            const canvas = this.renderer.domElement;
            this.resizeHandler = () => this.handleResize();
            this.sceneEventHandlers = {
                pointermove: (event) => this.handlePointerMove(event),
                pointerleave: () => this.handlePointerLeave(),
                pointerdown: (event) => this.handlePointerDown(event),
                pointerup: (event) => this.handlePointerUp(event),
                dblclick: (event) => this.handleDoubleClick(event),
                contextmenu: (event) => this.handleContextMenu(event)
            };

            canvas.addEventListener('pointermove', this.sceneEventHandlers.pointermove);
            canvas.addEventListener('pointerleave', this.sceneEventHandlers.pointerleave);
            canvas.addEventListener('pointerdown', this.sceneEventHandlers.pointerdown);
            canvas.addEventListener('pointerup', this.sceneEventHandlers.pointerup);
            canvas.addEventListener('dblclick', this.sceneEventHandlers.dblclick);
            canvas.addEventListener('contextmenu', this.sceneEventHandlers.contextmenu);
            window.addEventListener('resize', this.resizeHandler);
        },

        renderLoop() {
            const loop = () => {
                this.animationFrame = window.requestAnimationFrame(loop);
                if (this.controls) {
                    this.controls.update();
                }
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            };

            loop();
        },

        cleanupScene() {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            if (this.renderer && this.renderer.domElement) {
                const canvas = this.renderer.domElement;
                if (this.sceneEventHandlers) {
                    canvas.removeEventListener('pointermove', this.sceneEventHandlers.pointermove);
                    canvas.removeEventListener('pointerleave', this.sceneEventHandlers.pointerleave);
                    canvas.removeEventListener('pointerdown', this.sceneEventHandlers.pointerdown);
                    canvas.removeEventListener('pointerup', this.sceneEventHandlers.pointerup);
                    canvas.removeEventListener('dblclick', this.sceneEventHandlers.dblclick);
                    canvas.removeEventListener('contextmenu', this.sceneEventHandlers.contextmenu);
                }
            }

            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }

            if (this.controls) {
                this.controls.dispose();
            }

            this.disposeGroup(this.pathGroup);
            this.disposeGroup(this.agvGroup);

            if (this.plateMesh) {
                this.disposeObject(this.plateMesh);
                if (this.scene) {
                    this.scene.remove(this.plateMesh);
                }
            }

            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }

            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.controls = null;
            this.plateMesh = null;
            this.agvGroup = null;
            this.pathGroup = null;
            this.agvMeshes = {};
            this.pathMeshes = {};
            this.pickableMeshes = [];
            this.sceneEventHandlers = null;
            this.resizeHandler = null;
            this.followAgvId = null;
            this.followCameraTarget = null;
        },

        cleanupRealtime() {
            if (this.mockTimer) {
                clearInterval(this.mockTimer);
                this.mockTimer = null;
            }
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
                this.pollingTimer = null;
            }
            if (this.wsReconnectTimer) {
                clearTimeout(this.wsReconnectTimer);
                this.wsReconnectTimer = null;
            }
            if (this.wsPingTimer) {
                clearInterval(this.wsPingTimer);
                this.wsPingTimer = null;
            }
            if (this.ws) {
                this.ws.onopen = null;
                this.ws.onmessage = null;
                this.ws.onerror = null;
                this.ws.onclose = null;
                this.ws.close();
                this.ws = null;
            }
        },

        async loadInitialData() {
            const mapData = await this.fetchMap();
            const agvResult = await this.fetchAgvs();

            this.mapConfig = this.normalizeMapData(mapData);
            this.agvs = agvResult.data.map((item) => this.normalizeAgv(item));
            this.agvDataMode = agvResult.mode;
            this.connectionState = this.agvDataMode === 'simulation' ? 'simulation' : 'connecting';
            variables.AGV_SHARED_STATE.publish(agvResult.data);
            this.pathVisibility = {};
            this.pathData = {};

            await this.ensureAgvModelTemplate();

            this.renderMapPlate();
            this.syncAgvMeshes();
            this.fitCameraToBounds(false);
            this.updateTime();
        },

        async fetchMap() {
            if (variables.SIMULATION_MODE) {
                return this.buildMockMapData();
            }

            const response = await this.fetchJson('map');
            return response.data || response;
        },

        async fetchAgvs() {
            try {
                const response = await this.fetchJson('agv');
                variables.AGV_SHARED_STATE.publish(Array.isArray(response.data) ? response.data : []);
                return {
                    data: Array.isArray(response.data) ? response.data : [],
                    mode: 'api'
                };
            } catch (error) {
                if (variables.SIMULATION_MODE) {
                    return {
                        data: this.buildMockAgvs(),
                        mode: 'simulation'
                    };
                }

                throw error;
            }
        },

        async fetchPlannedPath(agvId) {
            if (variables.SIMULATION_MODE) {
                return this.buildMockPath(agvId);
            }

            const response = await this.fetchJson('agv/' + agvId + '/planned-path');
            return response.data || { agv_id: agvId, points: [] };
        },

        async fetchJson(path) {
            const url = this.buildApiUrl(path);
            const response = await fetch(url, {
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

        buildWsUrl() {
            return variables.WS_URL || 'ws://127.0.0.1:8000/ws';
        },

        normalizeMapData(data) {
            const scene3d = data.scene_3d || {};
            const bounds = scene3d.bounds || {};
            return {
                ground_z: Number(scene3d.ground_z || 0),
                plate_thickness: Number(scene3d.plate_thickness || 2),
                bounds: {
                    min_x: Number(bounds.min_x || 0),
                    max_x: Number(bounds.max_x || 100),
                    min_y: Number(bounds.min_y || 0),
                    max_y: Number(bounds.max_y || 80)
                }
            };
        },

        normalizeAgv(item) {
            return {
                id: item.id,
                name: item.name || ('AGV-' + String(item.id).padStart(3, '0')),
                model: item.model || 'R550',
                status: MAP_STATUS_META[item.status] ? item.status : 'idle',
                battery: Number(item.battery || 0),
                position_x: Number(item.position_x || 0),
                position_y: Number(item.position_y || 0),
                position_z: Number(item.position_z || 0),
                orientation: Number(item.orientation || 0),
                current_task_summary: item.current_task_summary || '',
                speed: Number(item.speed || 0),
                _mockMotion: item._mockMotion || null
            };
        },

        buildMockMapData() {
            return {
                scene_3d: {
                    bounds: {
                        min_x: 0,
                        max_x: 100,
                        min_y: 0,
                        max_y: 80
                    },
                    ground_z: 0,
                    plate_thickness: 2
                }
            };
        },

        buildMockAgvs() {
            return [
                {
                    id: 1,
                    name: 'AGV-001',
                    model: 'R550',
                    status: 'running',
                    battery: 87,
                    position_x: 16,
                    position_y: 18,
                    position_z: 0,
                    orientation: 35,
                    current_task_summary: 'A01 -> B03',
                    speed: 1.2,
                    _mockMotion: { vx: 0.42, vy: 0.22 }
                },
                {
                    id: 2,
                    name: 'AGV-002',
                    model: 'R550',
                    status: 'charging',
                    battery: 34,
                    position_x: 30,
                    position_y: 56,
                    position_z: 0,
                    orientation: 180,
                    current_task_summary: '返回充电区',
                    speed: 0,
                    _mockMotion: { vx: 0, vy: 0 }
                },
                {
                    id: 3,
                    name: 'AGV-003',
                    model: 'R550',
                    status: 'idle',
                    battery: 68,
                    position_x: 58,
                    position_y: 26,
                    position_z: 0,
                    orientation: 270,
                    current_task_summary: '等待任务分配',
                    speed: 0,
                    _mockMotion: { vx: 0, vy: 0 }
                },
                {
                    id: 4,
                    name: 'AGV-004',
                    model: 'R550',
                    status: 'error',
                    battery: 19,
                    position_x: 74,
                    position_y: 48,
                    position_z: 0,
                    orientation: 90,
                    current_task_summary: '路径偏离，人工确认中',
                    speed: 0,
                    _mockMotion: { vx: 0, vy: 0 }
                },
                {
                    id: 5,
                    name: 'AGV-005',
                    model: 'R600',
                    status: 'running',
                    battery: 76,
                    position_x: 84,
                    position_y: 18,
                    position_z: 0,
                    orientation: 220,
                    current_task_summary: 'C02 -> D05',
                    speed: 0.9,
                    _mockMotion: { vx: -0.28, vy: 0.18 }
                }
            ];
        },

        buildMockPath(agvId) {
            const pathMap = {
                1: [
                    { x: 16, y: 18, z: 0 },
                    { x: 24, y: 18, z: 0 },
                    { x: 35, y: 26, z: 0 },
                    { x: 47, y: 34, z: 0 }
                ],
                2: [
                    { x: 30, y: 56, z: 0 },
                    { x: 25, y: 60, z: 0 },
                    { x: 18, y: 66, z: 0 }
                ],
                3: [
                    { x: 58, y: 26, z: 0 },
                    { x: 58, y: 32, z: 0 },
                    { x: 58, y: 40, z: 0 }
                ],
                4: [
                    { x: 74, y: 48, z: 0 },
                    { x: 68, y: 48, z: 0 },
                    { x: 61, y: 44, z: 0 }
                ],
                5: [
                    { x: 84, y: 18, z: 0 },
                    { x: 78, y: 22, z: 0 },
                    { x: 70, y: 28, z: 0 },
                    { x: 60, y: 28, z: 0 }
                ]
            };

            return {
                agv_id: agvId,
                points: pathMap[agvId] || []
            };
        },

        renderMapPlate() {
            if (!this.scene || !this.mapConfig) {
                return;
            }

            if (this.plateMesh) {
                this.scene.remove(this.plateMesh);
                this.disposeObject(this.plateMesh);
                this.plateMesh = null;
            }

            const bounds = this.mapConfig.bounds;
            const width = Math.max(bounds.max_x - bounds.min_x, 1);
            const depth = Math.max(bounds.max_y - bounds.min_y, 1);
            const thickness = Math.max(this.mapConfig.plate_thickness, 1);
            const centerX = bounds.min_x + width / 2;
            const centerZ = bounds.min_y + depth / 2;
            const topY = this.mapConfig.ground_z;

            const plateGeometry = new THREE.BoxGeometry(width, thickness, depth);
            const plateMaterial = new THREE.MeshPhongMaterial({
                color: 0x132235,
                shininess: 8
            });
            const plate = new THREE.Mesh(plateGeometry, plateMaterial);
            plate.position.set(centerX, topY - thickness / 2, centerZ);

            const edgeGeometry = new THREE.EdgesGeometry(plateGeometry);
            const edgeLines = new THREE.LineSegments(
                edgeGeometry,
                new THREE.LineBasicMaterial({ color: 0x35587f, transparent: true, opacity: 0.8 })
            );
            plate.add(edgeLines);

            this.plateMesh = plate;
            this.scene.add(plate);
        },

        syncAgvMeshes() {
            if (!this.agvGroup) {
                return;
            }

            const nextIds = {};
            this.agvs.forEach((agv) => {
                nextIds[agv.id] = true;
                let mesh = this.agvMeshes[agv.id];
                if (!mesh) {
                    mesh = this.createAgvMesh(agv);
                    this.agvMeshes[agv.id] = mesh;
                    this.agvGroup.add(mesh);
                }
                this.updateAgvMesh(mesh, agv);
            });

            Object.keys(this.agvMeshes).forEach((id) => {
                if (!nextIds[id]) {
                    const mesh = this.agvMeshes[id];
                    this.agvGroup.remove(mesh);
                    this.disposeObject(mesh);
                    delete this.agvMeshes[id];
                }
            });

            this.pickableMeshes = Object.keys(this.agvMeshes)
                .map((id) => this.agvMeshes[id].getObjectByName('agvPick'))
                .filter(Boolean);

            this.syncFollowCamera();
        },

        async ensureAgvModelTemplate() {
            if (this.agvModelTemplate) {
                return;
            }
            if (this.agvModelLoadPromise) {
                await this.agvModelLoadPromise;
                return;
            }

            if (!window.THREE || !THREE.GLTFLoader) {
                return;
            }

            const url = variables.AGVCAR_MODEL_URL || 'AGVCARglb.glb';
            this.agvModelLoadPromise = new Promise((resolve) => {
                const loader = new THREE.GLTFLoader();
                loader.load(
                    url,
                    (gltf) => {
                        const model = gltf.scene || gltf.scenes[0];
                        this.agvModelTemplate = this.buildMapAgvModelTemplate(model);
                        this.agvModelLoadPromise = null;
                        resolve();
                    },
                    undefined,
                    () => {
                        this.agvModelLoadPromise = null;
                        resolve();
                    }
                );
            });

            await this.agvModelLoadPromise;
        },

        buildMapAgvModelTemplate(model) {
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
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material = node.material.map((m) => (m && m.clone ? m.clone() : m));
                    } else if (node.material.clone) {
                        node.material = node.material.clone();
                    }
                }
            });

            return model;
        },

        createAgvPickMesh(agv, size) {
            const w = size * 0.85;
            const h = size * 0.5;
            const d = size * 0.85;
            const geometry = new THREE.BoxGeometry(w, h, d);
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = h / 2;
            mesh.userData.agvId = agv.id;
            mesh.name = 'agvPick';
            return mesh;
        },

        applyAgvStatusTint(mesh, colorHex) {
            const c = new THREE.Color(colorHex);
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => {
                if (!mat || !mat.emissive) {
                    return;
                }
                mat.emissive.copy(c);
                mat.emissiveIntensity = 0.25;
            });
        },

        createAgvMesh(agv) {
            const group = new THREE.Group();
            group.userData.agvId = agv.id;

            const size = this.getAgvSize();

            if (this.agvModelTemplate) {
                const visual = this.agvModelTemplate.clone(true);
                visual.traverse((node) => {
                    if (node.isMesh && node.material) {
                        if (Array.isArray(node.material)) {
                            node.material = node.material.map((m) => (m && m.clone ? m.clone() : m));
                        } else if (node.material.clone) {
                            node.material = node.material.clone();
                        }
                        node.raycast = mapAgvEmptyRaycast;
                    }
                });
                group.add(visual);
            } else {
                const bodyGeometry = new THREE.BoxGeometry(size, size, size);
                const bodyMaterial = new THREE.MeshPhongMaterial({ color: this.getStatusMeta(agv.status).color });
                const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                body.userData.agvId = agv.id;

                const edgeLines = new THREE.LineSegments(
                    new THREE.EdgesGeometry(bodyGeometry),
                    new THREE.LineBasicMaterial({ color: 0xf1f6ff, transparent: true, opacity: 0.35 })
                );
                body.add(edgeLines);

                const arrow = new THREE.Mesh(
                    new THREE.ConeGeometry(size * 0.22, size * 0.6, 12),
                    new THREE.MeshPhongMaterial({ color: 0xe8eff8 })
                );
                arrow.rotation.x = Math.PI / 2;
                arrow.position.set(0, size * 0.1, size * 0.48);
                body.add(arrow);

                body.raycast = mapAgvEmptyRaycast;
                body.traverse((child) => {
                    if (child.raycast) {
                        child.raycast = mapAgvEmptyRaycast;
                    }
                });

                group.add(body);
            }

            group.add(this.createAgvPickMesh(agv, size));
            return group;
        },

        updateAgvMesh(group, agv) {
            const color = this.getStatusMeta(agv.status).color;
            const visual = group.children[0];

            if (this.agvModelTemplate && visual) {
                visual.traverse((node) => {
                    if (node.isMesh) {
                        this.applyAgvStatusTint(node, color);
                    }
                });
            } else if (visual && visual.material && visual.material.color) {
                visual.material.color.set(color);
            }

            const size = this.getAgvSize();
            const position = this.worldToScene(agv.position_x, agv.position_y, agv.position_z);
            const baseY = this.agvModelTemplate ? position.y : position.y + size / 2;
            group.position.set(position.x, baseY, position.z);
            group.rotation.y = THREE.MathUtils.degToRad(-agv.orientation);
        },

        getAgvSize() {
            if (!this.mapConfig) {
                return 2.8;
            }
            const bounds = this.mapConfig.bounds;
            const span = Math.min(bounds.max_x - bounds.min_x, bounds.max_y - bounds.min_y);
            return THREE.MathUtils.clamp(span / 20, 2.4, 4.5);
        },

        worldToScene(x, y, z) {
            return new THREE.Vector3(
                Number(x || 0),
                Number(this.mapConfig ? this.mapConfig.ground_z : 0) + Number(z || 0),
                Number(y || 0)
            );
        },

        handleResize() {
            if (!this.renderer || !this.camera || !this.$refs.viewport) {
                return;
            }

            const width = this.$refs.viewport.clientWidth || 1200;
            const height = this.$refs.viewport.clientHeight || 720;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        },

        getPointerFromEvent(event) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            return rect;
        },

        pickAgv(event) {
            if (!this.camera || !this.raycaster || !this.pickableMeshes.length) {
                return null;
            }

            this.getPointerFromEvent(event);
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const hits = this.raycaster.intersectObjects(this.pickableMeshes, false);
            if (!hits.length) {
                return null;
            }

            const agvId = hits[0].object.userData.agvId;
            return this.agvs.find((agv) => agv.id === agvId) || null;
        },

        handlePointerMove(event) {
            const agv = this.pickAgv(event);
            if (!agv) {
                this.tooltip.visible = false;
                return;
            }

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.tooltip.visible = true;
            this.tooltip.agv = agv;
            this.tooltip.x = Math.min(event.clientX - rect.left + 16, rect.width - 260);
            this.tooltip.y = Math.min(event.clientY - rect.top + 16, rect.height - 150);
        },

        handlePointerLeave() {
            this.tooltip.visible = false;
        },

        handlePointerDown(event) {
            this.pointerDownInfo = {
                x: event.clientX,
                y: event.clientY,
                button: event.button
            };
        },

        async handlePointerUp(event) {
            if (!this.pointerDownInfo || this.pointerDownInfo.button !== 0 || event.button !== 0) {
                this.pointerDownInfo = null;
                return;
            }

            const movedX = Math.abs(event.clientX - this.pointerDownInfo.x);
            const movedY = Math.abs(event.clientY - this.pointerDownInfo.y);
            this.pointerDownInfo = null;
            if (movedX > 4 || movedY > 4) {
                return;
            }

            const agv = this.pickAgv(event);
            if (agv) {
                this.enterAgvFollowView(agv);
            }
        },

        handleDoubleClick(event) {
            if (event.button !== 0) {
                return;
            }

            const agv = this.pickAgv(event);
            if (!agv) {
                return;
            }

            this.navigateToAgvDetail(agv);
        },

        async handleContextMenu(event) {
            event.preventDefault();
            const agv = this.pickAgv(event);
            if (!agv) {
                return;
            }

            await this.togglePathForAgv(agv);
        },

        async togglePathForAgv(agv) {
            const visible = !!this.pathVisibility[agv.id];
            if (visible) {
                this.pathVisibility[agv.id] = false;
                this.syncPathMeshes();
                this.showToast(agv.name + ' 规划路径已隐藏');
                return;
            }

            if (!this.pathData[agv.id]) {
                const response = await this.fetchPlannedPath(agv.id);
                this.pathData[agv.id] = Array.isArray(response.points) ? response.points : [];
            }

            this.pathVisibility[agv.id] = true;
            this.syncPathMeshes();

            if (this.pathData[agv.id].length) {
                this.showToast(agv.name + ' 规划路径已显示');
            } else {
                this.showToast(agv.name + ' 当前无有效规划路径');
            }
        },

        syncPathMeshes() {
            if (!this.pathGroup) {
                return;
            }

            Object.keys(this.pathMeshes).forEach((id) => {
                const shouldShow = !!this.pathVisibility[id];
                if (!shouldShow) {
                    const pathMesh = this.pathMeshes[id];
                    this.pathGroup.remove(pathMesh);
                    this.disposeObject(pathMesh);
                    delete this.pathMeshes[id];
                }
            });

            Object.keys(this.pathVisibility).forEach((id) => {
                if (!this.pathVisibility[id]) {
                    return;
                }

                const points = this.pathData[id] || [];
                if (this.pathMeshes[id]) {
                    this.pathGroup.remove(this.pathMeshes[id]);
                    this.disposeObject(this.pathMeshes[id]);
                    delete this.pathMeshes[id];
                }

                if (!points.length) {
                    return;
                }

                const vectors = points.map((point) => this.worldToScene(point.x, point.y, Number(point.z || 0) + 0.16));
                const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
                const material = new THREE.LineBasicMaterial({
                    color: 0x4a90d9,
                    transparent: true,
                    opacity: 0.95
                });
                const line = new THREE.Line(geometry, material);
                this.pathMeshes[id] = line;
                this.pathGroup.add(line);
            });
        },

        resetCamera() {
            this.clearAgvFollowView();
            this.fitCameraToBounds(false);
            this.showToast('视角已重置');
        },

        fitAllAgvs() {
            this.clearAgvFollowView();
            this.fitCameraToBounds(true);
            this.showToast('已调整到全局取景');
        },

        fitCameraToBounds(includeAgvs) {
            if (!this.mapConfig || !this.camera || !this.controls) {
                return;
            }

            let minX = this.mapConfig.bounds.min_x;
            let maxX = this.mapConfig.bounds.max_x;
            let minZ = this.mapConfig.bounds.min_y;
            let maxZ = this.mapConfig.bounds.max_y;

            if (includeAgvs && this.agvs.length) {
                this.agvs.forEach((agv) => {
                    minX = Math.min(minX, agv.position_x);
                    maxX = Math.max(maxX, agv.position_x);
                    minZ = Math.min(minZ, agv.position_y);
                    maxZ = Math.max(maxZ, agv.position_y);
                });
            }

            const spanX = Math.max(maxX - minX, 1);
            const spanZ = Math.max(maxZ - minZ, 1);
            const span = Math.max(spanX, spanZ);
            const centerX = minX + spanX / 2;
            const centerZ = minZ + spanZ / 2;

            this.controls.target.set(centerX, this.mapConfig.ground_z, centerZ);
            this.camera.position.set(
                centerX + span * 0.55,
                this.mapConfig.ground_z + Math.max(span * 1.05, 34),
                centerZ + span * 0.82
            );
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        },

        getAgvCameraTarget(agv) {
            const size = this.getAgvSize();
            const target = this.worldToScene(agv.position_x, agv.position_y, agv.position_z);
            target.y += size * 0.38;
            return target;
        },

        buildFollowCameraOffset(agv) {
            const size = this.getAgvSize();
            const angle = THREE.MathUtils.degToRad(Number(agv.orientation || 0));
            const distance = size * 3.6;
            const height = Math.max(size * 1.45, 4.2);
            return new THREE.Vector3(
                -Math.cos(angle) * distance,
                height,
                -Math.sin(angle) * distance
            );
        },

        setFollowControlsEnabled(enabled) {
            if (!this.controls) {
                return;
            }
            this.controls.enablePan = !enabled;
        },

        enterAgvFollowView(agv) {
            if (!agv || !this.camera || !this.controls) {
                return;
            }

            const target = this.getAgvCameraTarget(agv);
            const offset = this.buildFollowCameraOffset(agv);
            this.followAgvId = agv.id;
            this.followCameraTarget = target.clone();
            this.setFollowControlsEnabled(true);
            this.controls.target.copy(target);
            this.camera.position.copy(target.clone().add(offset));
            this.controls.update();
            this.showToast('已切换到 ' + agv.name + ' 第三人称视角');
        },

        clearAgvFollowView() {
            this.followAgvId = null;
            this.followCameraTarget = null;
            this.setFollowControlsEnabled(false);
        },

        syncFollowCamera() {
            if (!this.followAgvId || !this.camera || !this.controls) {
                return;
            }

            const agv = this.agvs.find((item) => item.id === this.followAgvId);
            if (!agv) {
                this.clearAgvFollowView();
                return;
            }

            const nextTarget = this.getAgvCameraTarget(agv);
            if (!this.followCameraTarget) {
                this.followCameraTarget = nextTarget.clone();
            }

            // 跟随移动时保留用户当前绕车旋转后的相机相对偏移。
            const offset = this.camera.position.clone().sub(this.controls.target);
            this.controls.target.copy(nextTarget);
            this.camera.position.copy(nextTarget.clone().add(offset));
            this.followCameraTarget.copy(nextTarget);
            this.controls.update();
        },

        buildAgvNavigationPayload(agv) {
            return {
                id: agv.id,
                name: agv.name,
                model: agv.model,
                status: agv.status,
                battery: agv.battery,
                position_x: agv.position_x,
                position_y: agv.position_y,
                position_z: agv.position_z,
                orientation: agv.orientation,
                current_task_summary: agv.current_task_summary,
                speed: agv.speed
            };
        },

        navigateToAgvDetail(agv) {
            try {
                sessionStorage.setItem(
                    variables.MAP_AGV_NAV_STORAGE_KEY,
                    JSON.stringify(this.buildAgvNavigationPayload(agv))
                );
            } catch (err) {
                /* ignore quota / private mode */
            }

            this.$router.push({ path: '/agv', query: { id: String(agv.id) } });
        },

        startMockRealtime() {
            this.connectionState = 'simulation';
            this.mockTimer = setInterval(() => {
                const bounds = this.mapConfig.bounds;
                this.agvs = this.agvs.map((agv) => {
                    if (!agv._mockMotion || (!agv._mockMotion.vx && !agv._mockMotion.vy)) {
                        return agv;
                    }

                    let nextX = agv.position_x + agv._mockMotion.vx;
                    let nextY = agv.position_y + agv._mockMotion.vy;
                    let nextVx = agv._mockMotion.vx;
                    let nextVy = agv._mockMotion.vy;

                    if (nextX <= bounds.min_x + 4 || nextX >= bounds.max_x - 4) {
                        nextVx = -nextVx;
                        nextX = agv.position_x + nextVx;
                    }
                    if (nextY <= bounds.min_y + 4 || nextY >= bounds.max_y - 4) {
                        nextVy = -nextVy;
                        nextY = agv.position_y + nextVy;
                    }

                    return {
                        ...agv,
                        position_x: Number(nextX.toFixed(2)),
                        position_y: Number(nextY.toFixed(2)),
                        orientation: Number((Math.atan2(nextVy, nextVx) * 180 / Math.PI).toFixed(1)),
                        battery: Math.max(10, Number((agv.battery - 0.05).toFixed(1))),
                        _mockMotion: { vx: nextVx, vy: nextVy }
                    };
                });

                variables.AGV_SHARED_STATE.publish(this.agvs);
                this.syncAgvMeshes();
                this.syncPathMeshes();
                this.updateTime();
            }, 1000);
        },

        connectAgvStatus() {
            this.connectionState = 'connecting';
            let retryDelay = 1000;

            const connect = () => {
                try {
                    this.ws = new WebSocket(this.buildWsUrl());
                } catch (error) {
                    this.startPolling();
                    return;
                }

                this.ws.onopen = () => {
                    retryDelay = 1000;
                    this.connectionState = 'connected';
                    this.ws.send(JSON.stringify({
                        action: 'subscribe',
                        topic: 'agv/status'
                    }));

                    this.wsPingTimer = setInterval(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ action: 'ping' }));
                        }
                    }, 30000);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.topic === 'agv/status' && Array.isArray(payload.data)) {
                            variables.AGV_SHARED_STATE.publish(payload.data);
                            this.agvs = payload.data.map((item) => this.normalizeAgv(item));
                            this.syncAgvMeshes();
                            this.syncPathMeshes();
                            this.updateTime();
                        }
                    } catch (error) {
                        this.connectionState = 'polling';
                    }
                };

                this.ws.onerror = () => {
                    this.connectionState = 'reconnecting';
                };

                this.ws.onclose = () => {
                    if (this.wsPingTimer) {
                        clearInterval(this.wsPingTimer);
                        this.wsPingTimer = null;
                    }

                    this.connectionState = 'reconnecting';
                    this.wsReconnectTimer = setTimeout(() => {
                        retryDelay = Math.min(retryDelay * 2, 30000);
                        connect();
                    }, retryDelay);
                };
            };

            connect();

            this.startPolling();
        },

        startPolling() {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
            }

            this.pollingTimer = setInterval(async () => {
                if (this.connectionState === 'connected') {
                    return;
                }

                try {
                    this.connectionState = 'polling';
                    const agvData = await this.fetchAgvs();
                    this.agvs = agvData.data.map((item) => this.normalizeAgv(item));
                    this.syncAgvMeshes();
                    this.syncPathMeshes();
                    this.updateTime();
                } catch (error) {
                    this.connectionState = 'disconnected';
                }
            }, variables.AGV_POLL_INTERVAL_MS || 1000);
        },

        updateTime() {
            this.lastUpdateTime = new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        },

        showToast(message) {
            this.toast.visible = true;
            this.toast.message = message;

            if (this.toastTimer) {
                clearTimeout(this.toastTimer);
            }

            this.toastTimer = setTimeout(() => {
                this.toast.visible = false;
            }, 1800);
        },

        getStatusMeta(status) {
            return MAP_STATUS_META[status] || MAP_STATUS_META.idle;
        },

        getStatusBadgeStyle(status) {
            const color = this.getStatusMeta(status).color;
            return {
                color,
                backgroundColor: this.toAlphaColor(color, 0.12),
                borderColor: this.toAlphaColor(color, 0.24)
            };
        },

        getBatteryStyle(value) {
            const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
            const color = safeValue >= 60 ? '#52c41a' : (safeValue >= 25 ? '#fa8c16' : '#f5222d');
            return {
                width: safeValue + '%',
                background: 'linear-gradient(90deg, ' + this.toAlphaColor(color, 0.9) + ' 0%, ' + color + ' 100%)'
            };
        },

        formatCoordinate(agv) {
            return '(' + agv.position_x.toFixed(1) + ', ' + agv.position_y.toFixed(1) + ', ' + agv.position_z.toFixed(1) + ')';
        },

        toAlphaColor(hexColor, alpha) {
            const clean = hexColor.replace('#', '');
            const value = clean.length === 3
                ? clean.split('').map((char) => char + char).join('')
                : clean;
            const num = parseInt(value, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
        },

        disposeGroup(group) {
            if (!group) {
                return;
            }

            while (group.children.length) {
                const child = group.children[0];
                group.remove(child);
                this.disposeObject(child);
            }
        },

        disposeObject(object) {
            if (!object) {
                return;
            }

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

            if (object.children && object.children.length) {
                object.children.slice().forEach((child) => {
                    object.remove(child);
                    this.disposeObject(child);
                });
            }
        }
    }
};

window.map = map;
