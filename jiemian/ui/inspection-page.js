/**
 * 物料检测模块页面（Vue 3 Options API）
 * 依赖：Vue 3、inspection-api.js、variables.js（可选）
 */
(function () {
    const STATUS_META = {
        ready: { label: '就绪', dot: '●', color: '#52c41a' },
        detecting: { label: '检测中', dot: '●', color: '#faad14' },
        qualified: { label: '合格', dot: '✅', color: '#1890ff' },
        failed: { label: '不合格', dot: '❌', color: '#f5222d' },
        abnormal: { label: '异常', dot: '⚠', color: '#fa8c16' }
    };

    const inspectionPage = {
        template: `
<div class="mi-wrap mi-page">
  <div class="page-title-bar">
    <div>
      <div class="page-title">物料检测与绑定</div>
      <div class="page-subtitle">上料位质量检查、划痕检测与物料绑定</div>
    </div>
  </div>

  <div class="mi-layout-column">
  <section class="glass mi-camera-panel">
    <div class="mi-card-head">
      <span class="mi-card-title">实时相机画面</span>
    </div>
    <div class="mi-card-body">
      <div class="mi-camera-toolbar">
        <span class="mi-camera-label">流地址</span>
        <input class="mi-input mi-camera-input" v-model.trim="cameraStreamHost" placeholder="192.168.1.126:8080" />
        <button type="button" class="mi-btn mi-btn--sm" @click="saveCameraHost">保存</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="refreshCameraStream">重连</button>
      </div>
      <div class="mi-camera-frame">
        <img v-if="!cameraLoadError" :src="cameraStreamUrl" class="mi-camera-img" alt="ROS2 相机流" @load="onCameraLoad" @error="onCameraError" />
        <div v-else class="mi-camera-empty">
          <div>相机流暂不可用</div>
          <div class="mi-sub">{{ cameraRetryCountdown > 0 ? cameraRetryCountdown + ' 秒后自动重连...' : cameraHintText }}</div>
        </div>
      </div>
      <div class="mi-sub mi-camera-tip">当前源：{{ cameraStreamUrl }}</div>
    </div>
  </section>

  <section class="glass mi-status-panel">
    <div class="mi-card-head">
      <span class="mi-card-title">核心状态</span>
    </div>
    <div class="mi-card-body mi-status-grid">
      <div class="mi-row">
        <span class="mi-label">状态</span>
        <span class="mi-status-line">
          <span class="mi-dot" :style="{ color: statusMeta.color }">{{ statusMeta.dot }}</span>
          <span :style="{ color: statusMeta.color }">{{ statusMeta.label }}</span>
        </span>
      </div>
      <div class="mi-row">
        <span class="mi-label">当前AGV</span>
        <span>{{ displayAgv }}</span>
      </div>
      <div class="mi-row">
        <span class="mi-label">预期型号</span>
        <span>{{ expectedModelText }}</span>
      </div>
      <div class="mi-row">
        <span class="mi-label">检测结果</span>
        <span :style="{ color: resultColor }">{{ resultText }}</span>
      </div>
      <div class="mi-row" v-if="scratchHint">
        <span class="mi-label"></span>
        <span class="mi-sub">{{ scratchHint }}</span>
      </div>
      <div class="mi-row">
        <span class="mi-label">绑定状态</span>
        <span :style="{ color: bindColor }">{{ bindStatus }}</span>
      </div>
      <div class="mi-row" v-if="bindTime">
        <span class="mi-label">绑定时间</span>
        <span>{{ bindTime }}</span>
      </div>
      <div class="mi-row">
        <span class="mi-label">检测时间</span>
        <span>{{ inspectTime || '--' }}</span>
      </div>
      <div class="mi-row mi-alert" v-if="exceptionBlock">
        <span class="mi-label">原因</span>
        <span>{{ exceptionBlock.reason }}</span>
      </div>
      <div class="mi-row mi-alert" v-if="exceptionBlock">
        <span class="mi-label">建议</span>
        <span>{{ exceptionBlock.suggestion }}</span>
      </div>
      <div class="mi-actions">
        <button type="button" class="mi-btn" @click="toggleHistory">{{ historyOpen ? '收起历史' : '查看检测历史' }}</button>
        <button type="button" class="mi-btn mi-btn--primary" v-if="uiStatus === 'ready'" @click="callBindDemo">模拟发起检测</button>
      </div>
      <div v-if="exceptionMode === 'bind_timeout'" class="mi-actions mi-actions--fail">
        <button type="button" class="mi-btn mi-btn--primary" @click="onRetryBind">重试绑定</button>
        <button type="button" class="mi-btn" v-if="canDispatch" @click="onManualCreateTask">手动创建任务</button>
      </div>
      <div v-if="exceptionMode === 'agv_offline'" class="mi-actions mi-actions--fail">
        <button type="button" class="mi-btn" @click="onCheckAgv">检查AGV状态</button>
        <button type="button" class="mi-btn mi-btn--danger" @click="onCancelBind">取消绑定</button>
      </div>
      <div v-if="exceptionMode === 'camera_fault'" class="mi-actions mi-actions--fail">
        <button type="button" class="mi-btn" @click="onRestartCamera">重启相机</button>
        <button type="button" class="mi-btn" @click="onManualInput">手动输入</button>
      </div>
      <div v-if="showFailActions" class="mi-actions mi-actions--fail mi-actions--full">
        <button type="button" class="mi-btn" @click="onRedetect">重新检测</button>
        <button type="button" class="mi-btn mi-btn--warn" v-if="canForcePass" @click="onForcePass">强制通过</button>
        <button type="button" class="mi-btn mi-btn--primary" @click="openDetailFromCurrent">查看详情</button>
      </div>
    </div>
  </section>

  <section class="glass mi-history-section">
    <button type="button" class="mi-history-toggle" @click="toggleHistory">
      <span>检测历史</span>
      <span class="mi-history-chevron">{{ historyOpen ? '▼ 收起' : '▶ 展开' }}</span>
    </button>
    <div v-show="historyOpen" class="mi-history">
      <div class="mi-history-toolbar">
        <span class="mi-history-title">检测历史（最近{{ historyLimit }}条）</span>
        <div class="mi-filters">
          <button v-for="f in historyFilters" :key="f.key" type="button"
            class="mi-chip" :class="{ active: historyFilter === f.key }" @click="historyFilter = f.key">{{ f.label }}</button>
        </div>
        <div class="mi-range">
          <input type="date" v-model="rangeStart" class="mi-input" />
          <span>—</span>
          <input type="date" v-model="rangeEnd" class="mi-input" />
          <button type="button" class="mi-btn mi-btn--sm" @click="loadHistory">筛选</button>
        </div>
      </div>
      <ul class="mi-history-list">
        <li v-for="row in filteredHistory" :key="row.id" class="mi-history-item" @click="openDetail(row)">
          <span class="mi-h-time">{{ row.time }}</span>
          <span class="mi-h-agv">{{ row.agv }}</span>
          <span class="mi-h-model">[{{ row.model }}]</span>
          <span :class="row.pass ? 'mi-ok' : 'mi-bad'">{{ row.pass ? '✅ 合格' : '❌ 不合格' }}</span>
          <span>→ {{ row.bindText }}</span>
        </li>
        <li v-if="!filteredHistory.length" class="mi-empty">暂无记录</li>
      </ul>
      <div class="mi-history-footer">
        <button type="button" class="mi-btn mi-btn--sm" @click="loadMore">查看更多</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="clearHistoryLocal">清除历史</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="exportHistory">导出</button>
      </div>
    </div>
  </section>
  </div>

  <div v-if="detailOpen" class="mi-modal-overlay" @click.self="detailOpen = false">
    <div class="mi-modal glass">
      <div class="mi-modal-head">
        <span>检测与绑定报告 - {{ detailTitle }}</span>
        <button type="button" class="mi-modal-x" @click="detailOpen = false">×</button>
      </div>
      <div class="mi-modal-body" v-if="detailRecord">
        <section>
          <h4>基本信息</h4>
          <ul class="mi-kv">
            <li><span>检测时间</span><strong>{{ detailRecord.inspectTime }}</strong></li>
            <li><span>绑定时间</span><strong>{{ detailRecord.bindTime || '--' }}</strong></li>
            <li><span>执行AGV</span><strong>{{ detailRecord.agv }}</strong></li>
            <li><span>检测相机</span><strong>{{ detailRecord.camera || '上料位相机#1' }}</strong></li>
          </ul>
        </section>
        <section>
          <h4>物料信息</h4>
          <ul class="mi-kv">
            <li><span>预期型号</span><strong>{{ detailRecord.expectedModel }}</strong></li>
            <li><span>物料颜色</span><strong>{{ detailRecord.color || '--' }}</strong></li>
            <li><span>物料形状</span><strong>{{ detailRecord.shape || '--' }}</strong></li>
          </ul>
        </section>
        <section>
          <h4>检测结果</h4>
          <ul class="mi-kv">
            <li><span>综合判定</span><strong>{{ detailRecord.judge }}</strong></li>
            <li><span>缺陷类型</span><strong>{{ detailRecord.defectType || '--' }}</strong></li>
            <li><span>缺陷数量</span><strong>{{ detailRecord.defectCount }}</strong></li>
            <li><span>最大划痕长度</span><strong>{{ detailRecord.scratchMm }}</strong></li>
            <li><span>位置坐标</span><strong>{{ detailRecord.pos }}</strong></li>
          </ul>
        </section>
        <section>
          <h4>绑定信息</h4>
          <ul class="mi-kv">
            <li><span>绑定结果</span><strong>{{ detailRecord.bindResult }}</strong></li>
            <li v-if="detailRecord.bindMaterial"><span>绑定物料</span><strong>{{ detailRecord.bindMaterial }}</strong></li>
            <li v-if="detailRecord.failReason"><span>失败原因</span><strong>{{ detailRecord.failReason }}</strong></li>
            <li><span>创建任务</span><strong>{{ detailRecord.taskCreated }}</strong></li>
            <li v-if="detailRecord.taskStatus"><span>任务状态</span><strong>{{ detailRecord.taskStatus }}</strong></li>
            <li v-if="detailRecord.routePath"><span>目标路径</span><strong>{{ detailRecord.routePath }}</strong></li>
            <li><span>处理人</span><strong>{{ detailRecord.handler || '--' }}</strong></li>
          </ul>
        </section>
      </div>
    </div>
  </div>

  <div class="mi-dev" v-if="showDevBar">
    <span>新手演示</span>
    <button type="button" class="mi-btn mi-btn--sm" @click="demoFlow('pass')">模拟合格</button>
    <button type="button" class="mi-btn mi-btn--sm" @click="demoFlow('fail')">模拟不合格</button>
    <button type="button" class="mi-btn mi-btn--sm" @click="demoFlow('reset')">复位就绪</button>
    <button type="button" class="mi-btn mi-btn--sm" @click="demoFlow('abnormal')">模拟异常</button>
  </div>
</div>
        `,
        data: function () {
            return {
                userRole: 'supervisor',
                showDevBar: true,
                historyOpen: true,
                historyLimit: 10,
                historyFilter: 'all',
                historyFilters: [
                    { key: 'all', label: '全部' },
                    { key: 'pass', label: '合格' },
                    { key: 'fail', label: '不合格' },
                    { key: 'bound', label: '绑定成功' }
                ],
                rangeStart: '',
                rangeEnd: '',
                historyRows: [],
                uiStatus: 'ready',
                agvId: '',
                agvPhase: '等待中',
                expectedModel: '',
                inspectResult: '',
                bindStatus: '未绑定',
                inspectTime: '',
                bindTime: '',
                scratchHint: '',
                exceptionMode: '',
                exceptionBlock: null,
                detailOpen: false,
                detailRecord: null,
                loading: false,
                cameraStreamHost: localStorage.getItem('mi_camera_stream_host') || '192.168.0.100:8080',
                cameraStreamPath: '/stream',
                cameraReloadTs: Date.now(),
                cameraLoadError: false,
                cameraRetryCountdown: 0,
                _cameraRetryTimer: null,
                _cameraCountdownTimer: null,
                _cameraVisibilityHandler: null
            };
        },
        computed: {
            canForcePass: function () {
                return ['supervisor', 'admin'].indexOf(this.userRole) >= 0;
            },
            canDispatch: function () {
                return ['dispatcher', 'admin'].indexOf(this.userRole) >= 0;
            },
            statusMeta: function () {
                if (this.exceptionMode) return STATUS_META.abnormal;
                const map = {
                    ready: STATUS_META.ready,
                    detecting: STATUS_META.detecting,
                    qualified: STATUS_META.qualified,
                    failed: STATUS_META.failed
                };
                return map[this.uiStatus] || STATUS_META.ready;
            },
            displayAgv: function () {
                if (!this.agvId) return '--';
                return '#' + this.agvId + (this.agvPhase ? ' (' + this.agvPhase + ')' : '');
            },
            expectedModelText: function () {
                return this.expectedModel ? '[' + this.expectedModel + ']' : '--';
            },
            resultText: function () {
                if (this.exceptionMode === 'camera_fault') return '无法检测';
                if (this.inspectResult === 'pass') return '✅ 合格：无划痕，可进入产线';
                if (this.inspectResult === 'fail') return '❌ 不合格：有划痕，需更换物料';
                if (this.uiStatus === 'detecting') return '检测中...';
                return '--';
            },
            resultColor: function () {
                if (this.inspectResult === 'pass') return '#1890ff';
                if (this.inspectResult === 'fail') return '#f5222d';
                if (this.uiStatus === 'detecting') return '#faad14';
                return 'var(--mi-muted)';
            },
            bindColor: function () {
                var b = this.bindStatus;
                if (b.indexOf('已绑定') === 0) return '#1890ff';
                if (b === '绑定失败') return '#f5222d';
                if (b === '检测中') return '#faad14';
                if (b.indexOf('超时') >= 0 || b.indexOf('中断') >= 0 || b.indexOf('故障') >= 0) return '#fa8c16';
                return 'var(--mi-text)';
            },
            cameraStreamUrl: function () {
                var host = (this.cameraStreamHost || '').trim();
                if (!host) host = '192.168.0.100:8080';
                var path = this.cameraStreamPath || '/stream';
                var delimiter = path.indexOf('?') >= 0 ? '&' : '?';
                return 'http://' + host + path + delimiter + 't=' + this.cameraReloadTs;
            },
            cameraHintText: function () {
                return '请确认 Ubuntu 端 MJPEG 服务已启动，且 Windows 可访问该地址。';
            },
            showFailActions: function () {
                return this.uiStatus === 'failed' && !this.exceptionMode;
            },
            filteredHistory: function () {
                var rows = this.historyRows;
                var f = this.historyFilter;
                if (f === 'all') return rows;
                return rows.filter(function (r) {
                    if (f === 'pass') return r.pass;
                    if (f === 'fail') return !r.pass;
                    if (f === 'bound') return r.bindText.indexOf('已绑定') >= 0;
                    return true;
                });
            },
            detailTitle: function () {
                return this.detailRecord && this.detailRecord.id ? '记录#' + this.detailRecord.id : '详情';
            }
        },
        mounted: function () {
            this.loadHistory();
            this.refreshCameraStream();
            // 切回本页面时自动重连
            this._cameraVisibilityHandler = () => {
                if (document.visibilityState === 'visible') {
                    this.refreshCameraStream();
                }
            };
            document.addEventListener('visibilitychange', this._cameraVisibilityHandler);
        },
        beforeUnmount: function () {
            this._clearCameraRetry();
            if (this._cameraVisibilityHandler) {
                document.removeEventListener('visibilitychange', this._cameraVisibilityHandler);
            }
        },
        methods: {
            toggleHistory: function () {
                this.historyOpen = !this.historyOpen;
                if (this.historyOpen) this.loadHistory();
            },
            loadHistory: function () {
                var self = this;
                this.loading = true;
                MaterialInspectionAPI.getHistory({
                    limit: this.historyLimit,
                    status: 'all',
                    start_time: this.rangeStart || undefined,
                    end_time: this.rangeEnd || undefined
                })
                    .then(function (res) {
                        self.applyHistoryResponse(res);
                    })
                    .catch(function (e) {
                        console.warn('[物料检测] 历史接口失败，使用本地演示数据', e);
                        self.historyRows = self.mockHistoryLocal();
                    })
                    .finally(function () {
                        self.loading = false;
                    });
            },
            applyHistoryResponse: function (res) {
                var items = res.items || (res.data && res.data.items) || res.data || res;
                var list = Array.isArray(items) ? items : [];
                var self = this;
                this.historyRows = list.map(function (it, i) {
                    return self.normalizeHistoryItem(it, i);
                });
            },
            normalizeHistoryItem: function (it, i) {
                var ir = it.inspection_result || {};
                var qualified = ir.qualified !== false && it.qualified !== false;
                return {
                    id: it.id || it.binding_id || String(i),
                    time: it.inspect_time || it.time || it.created_at || '--',
                    agv: 'AGV#' + (it.agv_id || it.agvId || '?'),
                    model: it.material_type || it.expected_type || it.model || '--',
                    pass: qualified,
                    bindText: it.bind_summary || (qualified ? '已绑定' : '绑定失败'),
                    raw: it
                };
            },
            mockHistoryLocal: function () {
                return [
                    { id: '1', time: '14:30:15', agv: 'AGV#3', model: '标准版', pass: true, bindText: '已绑定', raw: {} },
                    { id: '2', time: '14:28:40', agv: 'AGV#1', model: 'Pro版', pass: true, bindText: '已绑定', raw: {} },
                    { id: '3', time: '14:25:12', agv: 'AGV#2', model: 'Pro版', pass: false, bindText: '绑定失败', raw: {} }
                ];
            },
            loadMore: function () {
                this.historyLimit += 10;
                this.loadHistory();
            },
            clearHistoryLocal: function () {
                if (!confirm('仅清除当前页面列表显示，不会删除数据库。继续？')) return;
                this.historyRows = [];
            },
            exportHistory: function () {
                var self = this;
                MaterialInspectionAPI.exportHistory({
                    start_time: this.rangeStart,
                    end_time: this.rangeEnd
                }).catch(function () {
                    alert('导出接口尚未实现时可忽略；后端需返回文件或下载地址。');
                });
            },
            openDetail: function (row) {
                var raw = row.raw || {};
                this.detailRecord = this.buildDetailFromRow(row, raw);
                this.detailOpen = true;
            },
            openDetailFromCurrent: function () {
                this.detailRecord = this.buildDetailFromCurrent();
                this.detailOpen = true;
            },
            buildDetailFromRow: function (row, raw) {
                var pass = row.pass;
                var ir = raw.inspection_result || {};
                return {
                    id: row.id,
                    inspectTime: row.time,
                    bindTime: raw.binding_time || '--',
                    agv: row.agv,
                    camera: raw.camera_name || '上料位相机#1',
                    expectedModel: row.model,
                    color: raw.color || '黑色',
                    shape: raw.shape || '方形',
                    judge: pass ? '✅ 合格' : '❌ 不合格',
                    defectType: ir.defect_type || raw.defect_type || (pass ? null : '划痕'),
                    defectCount: ir.defect_count != null ? ir.defect_count : (pass ? 0 : 1),
                    scratchMm: (ir.details && ir.details.scratch_length != null ? ir.details.scratch_length : pass ? 0 : 3.2) + 'mm',
                    pos: raw.position_text || '(x:120, y:85)',
                    bindResult: pass ? '成功' : '失败',
                    bindMaterial: pass ? row.model : '',
                    failReason: pass ? '' : '划痕检测不合格',
                    taskCreated: raw.task_created || (pass ? 'T-012' : '未创建'),
                    taskStatus: pass ? '已开始执行' : '',
                    routePath: pass ? '上料位→工位1→工位2→工位4' : '',
                    handler: raw.handler || '--'
                };
            },
            buildDetailFromCurrent: function () {
                var pass = this.inspectResult === 'pass';
                return {
                    id: '当前',
                    inspectTime: this.inspectTime || '--',
                    bindTime: this.bindTime || '--',
                    agv: this.agvId ? 'AGV#' + this.agvId : '--',
                    expectedModel: this.expectedModel || '--',
                    judge: pass ? '✅ 合格' : '❌ 不合格',
                    defectType: pass ? null : '划痕',
                    defectCount: pass ? 0 : 1,
                    scratchMm: pass ? '0mm' : '3.2mm',
                    pos: '(x:120, y:85)',
                    bindResult: pass ? '成功' : '失败',
                    bindMaterial: pass ? this.expectedModel : '',
                    failReason: pass ? '' : '划痕检测不合格',
                    taskCreated: pass ? 'T-012' : '未创建',
                    taskStatus: pass ? '已开始执行' : '',
                    routePath: pass ? '上料位→工位1→工位2→工位4' : '',
                    camera: '上料位相机#1',
                    color: '黑色',
                    shape: '方形',
                    handler: '--'
                };
            },
            callBindDemo: function () {
                var self = this;
                this.uiStatus = 'detecting';
                this.agvId = '2';
                this.agvPhase = '夹取物料中';
                this.expectedModel = 'Pro版';
                this.bindStatus = '检测中';
                this.inspectResult = '';
                MaterialInspectionAPI.bind({
                    agv_id: '2',
                    material_data: {
                        expected_type: 'pro',
                        image_data: '',
                        position: 'feeding_station_1'
                    }
                })
                    .then(function (res) {
                        self.applyBindResponse(res);
                    })
                    .catch(function (e) {
                        alert('绑定请求失败：' + (e.message || e));
                        self.uiStatus = 'ready';
                    });
            },
            applyBindResponse: function (res) {
                var ir = res.inspection_result || {};
                var qualified = ir.qualified === true || res.status === 'success';
                this.inspectTime = this.formatTime(new Date());
                if (qualified) {
                    this.uiStatus = 'qualified';
                    this.inspectResult = 'pass';
                    this.bindStatus = '已绑定(' + (res.material_type || 'Pro版') + ')';
                    this.bindTime = res.binding_time ? String(res.binding_time).slice(11, 19) : this.nowClock();
                    this.agvPhase = '已绑定';
                    this.scratchHint = '';
                } else {
                    this.uiStatus = 'failed';
                    this.inspectResult = 'fail';
                    this.bindStatus = '绑定失败';
                    this.scratchHint = '发现划痕';
                    this.agvPhase = '检测中';
                }
            },
            onRedetect: function () {
                MaterialInspectionAPI.redetect({ agv_id: this.agvId }).catch(function (e) {
                    alert('重新检测接口待后端实现：' + e.message);
                });
            },
            onForcePass: function () {
                var reason = prompt('填写强制通过原因');
                if (reason === null) return;
                MaterialInspectionAPI.forcePass({ agv_id: this.agvId, reason: reason }).catch(function (e) {
                    alert('强制通过接口待后端实现：' + e.message);
                });
            },
            onRetryBind: function () {
                MaterialInspectionAPI.bind({ agv_id: this.agvId, material_data: {} }).catch(function (e) {
                    alert(e.message);
                });
            },
            onManualCreateTask: function () {
                alert('此处对接任务系统「手动创建任务」');
            },
            onCheckAgv: function () {
                alert('此处对接 AGV 监控或状态接口');
            },
            onCancelBind: function () {
                if (confirm('确认取消？')) this.demoFlow('reset');
            },
            onRestartCamera: function () {
                alert('此处调用相机重启接口');
            },
            onManualInput: function () {
                alert('此处打开手动录入表单');
            },
            demoFlow: function (mode) {
                this.exceptionMode = '';
                this.exceptionBlock = null;
                if (mode === 'reset') {
                    this.uiStatus = 'ready';
                    this.agvId = '';
                    this.agvPhase = '等待中';
                    this.expectedModel = '';
                    this.inspectResult = '';
                    this.bindStatus = '未绑定';
                    this.inspectTime = '';
                    this.bindTime = '';
                    this.scratchHint = '';
                    return;
                }
                if (mode === 'abnormal') {
                    this.exceptionMode = 'bind_timeout';
                    this.uiStatus = 'qualified';
                    this.agvId = '2';
                    this.expectedModel = 'Pro版';
                    this.inspectResult = 'pass';
                    this.bindStatus = '绑定超时';
                    this.exceptionBlock = {
                        reason: '任务创建超时，请检查任务系统',
                        suggestion: '检查网络连接，重试绑定'
                    };
                    return;
                }
                this.agvId = '2';
                this.expectedModel = 'Pro版';
                if (mode === 'pass') {
                    this.uiStatus = 'qualified';
                    this.inspectResult = 'pass';
                    this.bindStatus = '已绑定(Pro版)';
                    this.inspectTime = this.nowClock();
                    this.bindTime = this.nowClock();
                    this.agvPhase = '已绑定';
                    this.scratchHint = '';
                } else {
                    this.uiStatus = 'failed';
                    this.inspectResult = 'fail';
                    this.bindStatus = '绑定失败';
                    this.inspectTime = this.nowClock();
                    this.agvPhase = '检测中';
                    this.scratchHint = '发现1处划痕';
                }
            },
            nowClock: function () {
                var d = new Date();
                return d.toTimeString().slice(0, 8);
            },
            formatTime: function (d) {
                return d.toTimeString().slice(0, 8);
            },
            refreshCameraStream: function () {
                this._clearCameraRetry();
                this.cameraLoadError = false;
                this.cameraRetryCountdown = 0;
                this.cameraReloadTs = Date.now();
            },
            onCameraLoad: function () {
                this._clearCameraRetry();
                this.cameraLoadError = false;
                this.cameraRetryCountdown = 0;
            },
            onCameraError: function () {
                this.cameraLoadError = true;
                this._scheduleCameraRetry(3); // 3秒后自动重连
            },
            _clearCameraRetry: function () {
                if (this._cameraRetryTimer) { clearTimeout(this._cameraRetryTimer); this._cameraRetryTimer = null; }
                if (this._cameraCountdownTimer) { clearInterval(this._cameraCountdownTimer); this._cameraCountdownTimer = null; }
                this.cameraRetryCountdown = 0;
            },
            _scheduleCameraRetry: function (seconds) {
                this._clearCameraRetry();
                this.cameraRetryCountdown = seconds;
                this._cameraCountdownTimer = setInterval(() => {
                    this.cameraRetryCountdown = Math.max(0, this.cameraRetryCountdown - 1);
                }, 1000);
                this._cameraRetryTimer = setTimeout(() => {
                    this.refreshCameraStream();
                }, seconds * 1000);
            },
            saveCameraHost: function () {
                localStorage.setItem('mi_camera_stream_host', this.cameraStreamHost || '');
                this.refreshCameraStream();
            }
        }
    };

    window.inspectionPage = inspectionPage;
})();
