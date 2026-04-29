/**
 * 事件日志页面 — 事件日志部分ui.md
 */
(function () {
    function escapeHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var eventsPage = {
        template: `
<div class="ev-page">
    <div class="page-title-bar">
    <div>
      <div class="page-title">事件日志</div>
      <div class="page-subtitle">系统运行事件实时监控与检索；任务管理中的运行日志会实时汇入本页（同一会话内）</div>
    </div>
  </div>

  <div class="glass ev-toolbar">
    <div class="ev-toolbar-left">
      <button v-for="lv in levelChips" :key="lv.key" type="button" class="ev-chip"
        :class="[ { active: levelFilter === lv.key }, lv.chipClass ]"
        @click="levelFilter = lv.key">{{ lv.label }}</button>
      <input type="search" class="ev-search" v-model.trim="searchText" placeholder="搜索事件内容…" @input="onSearchInput" />
    </div>
    <div class="ev-toolbar-right">
      <button type="button" class="mi-btn mi-btn--sm" @click="advancedOpen = !advancedOpen">{{ advancedOpen ? '收起高级筛选' : '高级筛选' }}</button>
      <button type="button" class="mi-btn mi-btn--sm" @click="openSettings">设置</button>
    </div>
  </div>

  <div v-show="advancedOpen" class="glass ev-advanced">
    <div class="ev-advanced-grid">
      <div class="ev-field">
        <label>模块</label>
        <select v-model="advModule">
          <option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="ev-field">
        <label>时间</label>
        <select v-model="advTimePreset">
          <option value="all">全部</option>
          <option value="today">今天</option>
          <option value="1h">最近1小时</option>
          <option value="24h">最近24小时</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="ev-field" v-if="advTimePreset === 'custom'">
        <label>开始</label>
        <input type="datetime-local" v-model="advStart" class="mi-input" style="width:100%;padding:8px;" />
      </div>
      <div class="ev-field" v-if="advTimePreset === 'custom'">
        <label>结束</label>
        <input type="datetime-local" v-model="advEnd" class="mi-input" style="width:100%;padding:8px;" />
      </div>
      <div class="ev-field">
        <label>AGV</label>
        <select v-model="advAgv">
          <option v-for="a in agvOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="ev-field">
        <label>任务</label>
        <input type="text" v-model.trim="advTask" class="mi-input" style="width:100%;padding:8px;" placeholder="任务ID或全部" />
      </div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button type="button" class="mi-btn mi-btn--primary mi-btn--sm" @click="applyAdvanced">应用筛选</button>
      <button type="button" class="mi-btn mi-btn--sm" @click="resetAdvanced">重置</button>
    </div>
  </div>

  <div class="glass ev-list-wrap">
    <ul class="ev-list" ref="listRef" @scroll="onListScroll">
      <li v-for="ev in visibleEvents" :key="ev.uid"
          class="ev-item"
          :class="itemAnimClass(ev)"
          @dblclick="openDetail(ev)">
        <span class="ev-item-time">{{ formatEventTime(ev) }}</span>
        <span class="ev-item-level" :class="levelClass(ev.level)">{{ levelLabel(ev.level) }}</span>
        <span class="ev-item-msg" v-html="messageHtml(ev.message)"></span>
      </li>
      <li v-if="!visibleEvents.length" class="mi-empty" style="padding:40px;">暂无事件，请调整筛选或点击刷新。</li>
    </ul>
    <div class="ev-footer">
      <span>共 {{ visibleEvents.length }} 条（显示范围内）</span>
      <div class="ev-footer-btns">
        <button type="button" class="mi-btn mi-btn--sm" :class="{ 'mi-btn--primary': autoScroll }" @click="autoScroll = !autoScroll">{{ autoScroll ? '自动滚动：开' : '自动滚动：关' }}</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="paused = !paused">{{ paused ? '继续' : '暂停' }}</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="refreshList">刷新</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="clearDisplay">清空显示</button>
        <button type="button" class="mi-btn mi-btn--sm" @click="exportCsv">导出</button>
      </div>
    </div>
  </div>

  <div v-if="detailOpen" class="mi-modal-overlay" @click.self="detailOpen = false">
    <div class="mi-modal glass ev-modal-wide">
      <div class="mi-modal-head">
        <span>事件详情 - 记录#{{ detailEvent && detailEvent.id }}</span>
        <button type="button" class="mi-modal-x" @click="detailOpen = false">×</button>
      </div>
      <div class="mi-modal-body ev-detail-body" v-if="detailEvent">
        <div class="ev-detail-section">
          <h4>基本信息</h4>
          <ul class="ev-detail-kv">
            <li><span>时间</span><strong>{{ detailEvent.tsFull }}</strong></li>
            <li><span>级别</span><strong>{{ levelLabel(detailEvent.level) }}</strong></li>
            <li><span>模块</span><strong>{{ detailEvent.module }}</strong></li>
            <li><span>事件ID</span><strong>{{ detailEvent.eventId }}</strong></li>
            <li v-if="detailEvent.event_code"><span>事件代码</span><strong>{{ detailEvent.event_code }}</strong></li>
          </ul>
        </div>
        <div class="ev-detail-section">
          <h4>事件内容</h4>
          <p>{{ detailEvent.message }}</p>
          <template v-if="detailEvent.extraLines">
            <p v-for="(line,idx) in detailEvent.extraLines" :key="idx" style="color:var(--color-text-secondary);font-size:13px;">{{ line }}</p>
          </template>
        </div>
        <div class="ev-detail-section">
          <h4>上下文信息</h4>
          <ul class="ev-detail-kv">
            <li><span>相关AGV</span><strong>{{ detailEvent.ctxAgv }}</strong></li>
            <li><span>相关任务</span><strong>{{ detailEvent.ctxTask }}</strong></li>
            <li><span>相关工位</span><strong>{{ detailEvent.ctxStation }}</strong></li>
            <li><span>用户操作</span><strong>{{ detailEvent.ctxUser }}</strong></li>
          </ul>
        </div>
        <div class="ev-detail-section" v-if="detailEvent.handleStatus">
          <h4>处理状态</h4>
          <ul class="ev-detail-kv">
            <li><span>状态</span><strong>{{ detailEvent.handleStatus }}</strong></li>
            <li><span>处理方式</span><strong>{{ detailEvent.handleMethod || '--' }}</strong></li>
            <li><span>处理结果</span><strong>{{ detailEvent.handleResult || '--' }}</strong></li>
            <li><span>处理时间</span><strong>{{ detailEvent.handleTime || '--' }}</strong></li>
          </ul>
        </div>
        <div class="ev-detail-section" v-if="detailEvent.related && detailEvent.related.length">
          <h4>相关事件</h4>
          <ul class="ev-detail-kv">
            <li v-for="r in detailEvent.related" :key="r.id"><span>#{{ r.id }}</span><strong>{{ r.summary }}</strong></li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div v-if="settingsOpen" class="mi-modal-overlay" @click.self="settingsOpen = false">
    <div class="mi-modal glass ev-modal-wide">
      <div class="mi-modal-head">
        <span>事件日志设置</span>
        <button type="button" class="mi-modal-x" @click="settingsOpen = false">×</button>
      </div>
      <div class="mi-modal-body">
        <h4 style="font-size:13px;color:var(--color-text-secondary);">存储设置</h4>
        <div class="ev-settings-grid">
          <label>保存天数 <input type="number" v-model.number="settings.retentionDays" min="1" max="365" /></label>
          <label>最大文件(MB) <input type="number" v-model.number="settings.maxMb" min="10" /></label>
          <label><input type="checkbox" v-model="settings.autoClean" /> 自动清理</label>
          <label><input type="checkbox" v-model="settings.compress" /> 压缩旧日志</label>
        </div>
        <h4 style="font-size:13px;color:var(--color-text-secondary);margin-top:16px;">记录级别（前端偏好，待接后端）</h4>
        <div class="ev-settings-grid">
          <label v-for="mod in settingsModuleKeys" :key="mod"> {{ mod }}
            <select v-model="settings.levels[mod]">
              <option v-for="opt in levelOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;">
          <button type="button" class="mi-btn mi-btn--primary" @click="saveSettings">应用</button>
          <button type="button" class="mi-btn" @click="resetSettingsDefault">恢复默认</button>
        </div>
      </div>
    </div>
  </div>
</div>
        `,
        data: function () {
            return {
                levelFilter: 'all',
                levelChips: [
                    { key: 'all', label: '全部', chipClass: '' },
                    { key: 'INFO', label: '信息', chipClass: '' },
                    { key: 'WARN', label: '警告', chipClass: 'ev-chip--warn' },
                    { key: 'ERROR', label: '错误', chipClass: 'ev-chip--err' }
                ],
                searchText: '',
                searchDebounce: null,
                advancedOpen: false,
                advModule: '全部',
                advTimePreset: 'all',
                advStart: '',
                advEnd: '',
                advAgv: '全部',
                advTask: '',
                moduleOptions: ['全部', '任务系统', 'AGV调度', '物料检测', '工位控制', '系统'],
                agvOptions: ['全部', '#1', '#2', '#3', '#4'],
                serverEvents: [],
                liveEvents: [],
                liveFlash: {},
                timeWindowStart: null,
                timeWindowEnd: null,
                autoScroll: true,
                paused: false,
                pollTimer: null,
                streamUnsub: null,
                detailOpen: false,
                detailEvent: null,
                settingsOpen: false,
                settings: {
                    retentionDays: 30,
                    maxMb: 100,
                    autoClean: true,
                    compress: true,
                    levels: {
                        系统: '信息',
                        AGV调度: '信息',
                        任务系统: '信息',
                        物料检测: '信息',
                        工位控制: '警告'
                    }
                },
                settingsModuleKeys: ['系统', 'AGV调度', '任务系统', '物料检测', '工位控制'],
                levelOptions: ['错误', '警告', '信息', '调试', '无']
            };
        },
        computed: {
            mergedEvents: function () {
                var map = {};
                this.serverEvents.forEach(function (e) {
                    map[e.uid] = e;
                });
                this.liveEvents.forEach(function (e) {
                    map[e.uid] = e;
                });
                return Object.values(map).sort(function (a, b) {
                    return b.t - a.t;
                });
            },
            visibleEvents: function () {
                var self = this;
                var list = this.mergedEvents.slice();
                if (this.levelFilter !== 'all') {
                    list = list.filter(function (e) {
                        return e.level === self.levelFilter;
                    });
                }
                if (this.advModule && this.advModule !== '全部') {
                    list = list.filter(function (e) {
                        return e.module === self.advModule;
                    });
                }
                if (this.advAgv && this.advAgv !== '全部') {
                    var aid = self.advAgv.replace('#', '');
                    list = list.filter(function (e) {
                        var d = e.details || {};
                        return (d.agv_id || e.related_agv || '') === aid || (e.message && e.message.indexOf('AGV#' + aid) >= 0);
                    });
                }
                if (this.advTask && this.advTask.trim()) {
                    var tid = this.advTask.trim().toLowerCase();
                    list = list.filter(function (e) {
                        return (
                            (e.message && e.message.toLowerCase().indexOf(tid) >= 0) ||
                            ((e.details && e.details.task_id) || '').toLowerCase().indexOf(tid) >= 0
                        );
                    });
                }
                if (this.timeWindowStart) {
                    list = list.filter(function (e) {
                        return e.t >= self.timeWindowStart;
                    });
                }
                if (this.timeWindowEnd) {
                    list = list.filter(function (e) {
                        return e.t <= self.timeWindowEnd;
                    });
                }
                if (this.searchText) {
                    var q = this.searchText.toLowerCase();
                    list = list.filter(function (e) {
                        return e.message && e.message.toLowerCase().indexOf(q) >= 0;
                    });
                }
                return list.sort(function (a, b) {
                    return b.t - a.t;
                });
            }
        },
        watch: {
            visibleEvents: function () {
                var self = this;
                this.$nextTick(function () {
                    if (self.autoScroll && !self.paused && self.$refs.listRef) {
                        self.$refs.listRef.scrollTop = self.$refs.listRef.scrollHeight;
                    }
                });
            }
        },
        mounted: function () {
            this.loadSettings();
            this.hydrateLiveFromStream();
            this.attachStream();
            this.refreshList();
            var self = this;
            this.pollTimer = setInterval(function () {
                if (!self.paused) self.refreshList(true);
            }, 8000);
        },
        beforeUnmount: function () {
            if (this.pollTimer) clearInterval(this.pollTimer);
            if (this.searchDebounce) clearTimeout(this.searchDebounce);
            if (typeof this.streamUnsub === 'function') {
                this.streamUnsub();
                this.streamUnsub = null;
            }
        },
        methods: {
            onSearchInput: function () {},
            onListScroll: function () {},
            levelLabel: function (lv) {
                var m = { INFO: '信息', WARN: '警告', ERROR: '错误', DEBUG: '调试' };
                return m[lv] || lv;
            },
            levelClass: function (lv) {
                if (lv === 'INFO') return 'l-info';
                if (lv === 'WARN') return 'l-warn';
                if (lv === 'ERROR') return 'l-error';
                return 'l-debug';
            },
            formatEventTime: function (ev) {
                var d = new Date(ev.t);
                return d.toTimeString().slice(0, 8);
            },
            messageHtml: function (msg) {
                var base = escapeHtml(msg || '');
                var q = (this.searchText || '').trim();
                if (!q) return base;
                try {
                    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                    return base.replace(re, '<mark>$1</mark>');
                } catch (e) {
                    return base;
                }
            },
            itemAnimClass: function (ev) {
                if (this.liveFlash[ev.uid]) return 'is-new';
                return '';
            },
            hydrateLiveFromStream: function () {
                if (typeof window === 'undefined' || !window.jiemianEventStream) return;
                var self = this;
                var recent = window.jiemianEventStream.getRecent(300);
                this.liveEvents = recent.map(function (item) {
                    return self.taskLogItemToRow(item);
                });
            },
            attachStream: function () {
                if (typeof window === 'undefined' || !window.jiemianEventStream) return;
                var self = this;
                this.streamUnsub = window.jiemianEventStream.subscribe(function () {
                    self.ingestTaskStreamItem.apply(self, arguments);
                });
            },
            taskLogItemToRow: function (item) {
                var levelMap = { info: 'INFO', warning: 'WARN', error: 'ERROR' };
                var raw = {
                    timestamp: item.time,
                    level: levelMap[item.level] || 'INFO',
                    module: '任务系统',
                    event_code: 'TASK_LOG',
                    message: item.text,
                    details: {
                        task_id: item.taskId,
                        source: 'task_terminal',
                        group: item.group
                    },
                    id: item.id,
                    event_id: 'EVT_TASK_' + String(item.id).replace(/\W/g, '_')
                };
                var row = this.normalizeRow(raw, 0);
                row.uid = 'live-' + item.id;
                row._fromStream = true;
                return row;
            },
            ingestTaskStreamItem: function (item) {
                if (!item || item.type !== 'task_log') return;
                var row = this.taskLogItemToRow(item);
                var exists = this.liveEvents.some(function (e) {
                    return e.uid === row.uid;
                });
                if (exists) return;
                this.liveEvents.unshift(row);
                if (this.liveEvents.length > 400) {
                    this.liveEvents.length = 400;
                }
                var flash = Object.assign({}, this.liveFlash);
                flash[row.uid] = true;
                this.liveFlash = flash;
                var self = this;
                setTimeout(function () {
                    var next = Object.assign({}, self.liveFlash);
                    delete next[row.uid];
                    self.liveFlash = next;
                }, 650);
                this.$nextTick(function () {
                    if (self.autoScroll && !self.paused && self.$refs.listRef) {
                        self.$refs.listRef.scrollTop = self.$refs.listRef.scrollHeight;
                    }
                });
            },
            normalizeRow: function (raw, idx) {
                var ts = raw.timestamp || raw.created_at || new Date().toISOString();
                var t = new Date(ts).getTime();
                var id = raw.id != null ? raw.id : idx;
                return {
                    uid: 'e-' + id + '-' + t,
                    id: id,
                    t: t,
                    tsFull: ts,
                    level: (raw.level || 'INFO').toUpperCase(),
                    module: raw.module || '系统',
                    event_code: raw.event_code || '',
                    message: raw.message || '',
                    details: raw.details || {},
                    related_agv: raw.related_agv,
                    eventId: raw.event_id || 'EVT_' + String(id),
                    raw: raw
                };
            },
            refreshList: function (silent) {
                var self = this;
                var params = { limit: 120 };
                if (this.levelFilter !== 'all') params.level = this.levelFilter.toLowerCase();
                EventsLogAPI.getList(params)
                    .then(function (res) {
                        var arr = res.events || (res.data && res.data.events) || [];
                        var next = arr.map(function (r, i) {
                            return self.normalizeRow(r, i);
                        });
                        self.serverEvents = next;
                        if (!silent) {
                            self.$nextTick(function () {
                                if (self.$refs.listRef && self.autoScroll) {
                                    self.$refs.listRef.scrollTop = self.$refs.listRef.scrollHeight;
                                }
                            });
                        }
                    })
                    .catch(function () {
                        if (!silent) self.serverEvents = self.mockEvents();
                    });
            },
            mockEvents: function () {
                var self = this;
                // 与后端演示锚点一致；勿用 Date.now()，否则接口失败时轮询会让假事件时间一直变
                var anchor = Date.parse('2024-12-01T14:30:15.000Z');
                var samples = [
                    { id: 1, timestamp: new Date(anchor).toISOString(), event_id: 'EVT_MOCK_1', level: 'INFO', module: '任务系统', event_code: 'TASK_CREATED', message: '【演示】任务T-015(Pro版)已创建，分配给AGV#2。', details: { task_id: 'T-015', agv_id: '2' } },
                    { id: 2, timestamp: new Date(anchor - 120000).toISOString(), event_id: 'EVT_MOCK_2', level: 'INFO', module: 'AGV调度', message: '【演示】AGV#3到达下线点，任务T-014完成。', details: { agv_id: '3', task_id: 'T-014' } },
                    { id: 3, timestamp: new Date(anchor - 300000).toISOString(), event_id: 'EVT_MOCK_3', level: 'WARN', module: 'AGV调度', event_code: 'AGV_WAIT_TIMEOUT', message: '【演示】AGV#2在工位3等待超时(超过2分钟)。', details: { agv_id: '2', station: '工位3', task_id: 'T-013', wait_time: 135 } },
                    { id: 4, timestamp: new Date(anchor - 420000).toISOString(), event_id: 'EVT_MOCK_4', level: 'INFO', module: '物料检测', message: '【演示】物料检测合格，Pro版物料已绑定到AGV#2。', details: {} },
                    { id: 5, timestamp: new Date(anchor - 600000).toISOString(), event_id: 'EVT_MOCK_5', level: 'INFO', module: 'AGV调度', message: '【演示】AGV#1开始充电，电量: 15%。', details: { agv_id: '1' } },
                    { id: 6, timestamp: new Date(anchor - 720000).toISOString(), event_id: 'EVT_MOCK_6', level: 'ERROR', module: '工位控制', event_code: 'DEVICE_CONNECTION_LOST', message: '【演示】上料位相机通信中断，已尝试重连。', details: {} }
                ];
                return samples.map(function (r, i) {
                    return self.normalizeRow(r, i);
                });
            },
            applyAdvanced: function () {
                var now = Date.now();
                this.timeWindowStart = null;
                this.timeWindowEnd = null;
                if (this.advTimePreset === 'today') {
                    var d = new Date();
                    d.setHours(0, 0, 0, 0);
                    this.timeWindowStart = d.getTime();
                } else if (this.advTimePreset === '1h') {
                    this.timeWindowStart = now - 3600000;
                } else if (this.advTimePreset === '24h') {
                    this.timeWindowStart = now - 86400000;
                } else if (this.advTimePreset === 'custom' && this.advStart) {
                    this.timeWindowStart = new Date(this.advStart).getTime();
                    if (this.advEnd) this.timeWindowEnd = new Date(this.advEnd).getTime();
                }
            },
            resetAdvanced: function () {
                this.advModule = '全部';
                this.advTimePreset = 'all';
                this.advStart = '';
                this.advEnd = '';
                this.advAgv = '全部';
                this.advTask = '';
                this.timeWindowStart = null;
                this.timeWindowEnd = null;
            },
            clearDisplay: function () {
                this.serverEvents = [];
                this.liveEvents = [];
            },
            exportCsv: function () {
                var rows = this.visibleEvents;
                var lines = ['时间,级别,模块,消息'];
                rows.forEach(function (e) {
                    lines.push(
                        [new Date(e.t).toISOString(), e.level, e.module, '"' + String(e.message).replace(/"/g, '""') + '"'].join(',')
                    );
                });
                var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'events-export.csv';
                a.click();
                URL.revokeObjectURL(a.href);
            },
            extractAgvFromMessage: function (msg) {
                if (!msg) return '--';
                var m = String(msg).match(/AGV#(\d+)/i);
                return m ? '#' + m[1] : '--';
            },
            openDetail: function (ev) {
                var d = ev.details || {};
                this.detailEvent = {
                    id: ev.id,
                    tsFull: ev.tsFull,
                    level: ev.level,
                    module: ev.module,
                    eventId: ev.eventId,
                    event_code: ev.event_code,
                    message: ev.message,
                    extraLines: this.buildExtraLines(d, ev),
                    ctxAgv: d.agv_id ? '#' + d.agv_id : this.extractAgvFromMessage(ev.message),
                    ctxTask: d.task_id || '--',
                    ctxStation: d.station || '--',
                    ctxUser: d.user_op || '无',
                    handleStatus: d.handle_status || (ev.level === 'WARN' ? '已自动处理' : null),
                    handleMethod: d.handle_method || '重新规划路径',
                    handleResult: d.handle_result || 'AGV#2已跳过工位3',
                    handleTime: d.handle_time || '14:25:30',
                    related: d.related_chain || this.mockRelated(ev)
                };
                this.detailOpen = true;
            },
            buildExtraLines: function (d, ev) {
                var lines = [];
                if (d.task_id) lines.push('当前状态: 任务' + d.task_id + '执行中。');
                if (d.station) lines.push('工位状态: 设备繁忙。');
                return lines.length ? lines : null;
            },
            mockRelated: function (ev) {
                if (ev.event_code !== 'AGV_WAIT_TIMEOUT') return [];
                return [
                    { id: 40, summary: '14:23:05 [信息] AGV#2到达工位3。' },
                    { id: 41, summary: '14:24:30 [警告] 工位3机械臂响应缓慢。' }
                ];
            },
            openSettings: function () {
                this.settingsOpen = true;
            },
            loadSettings: function () {
                try {
                    var s = localStorage.getItem('jiemian_events_settings');
                    if (s) {
                        var o = JSON.parse(s);
                        this.settings = Object.assign(this.settings, o);
                    }
                } catch (e) {}
            },
            saveSettings: function () {
                try {
                    localStorage.setItem('jiemian_events_settings', JSON.stringify(this.settings));
                } catch (e) {}
                this.settingsOpen = false;
            },
            resetSettingsDefault: function () {
                this.settings.retentionDays = 30;
                this.settings.maxMb = 100;
                this.settings.autoClean = true;
                this.settings.compress = true;
                this.settings.levels = {
                    系统: '信息',
                    AGV调度: '信息',
                    任务系统: '信息',
                    物料检测: '信息',
                    工位控制: '警告'
                };
            }
        }
    };

    window.eventsPage = eventsPage;
})();
