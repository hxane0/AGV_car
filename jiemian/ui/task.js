const TASK_TERMINAL_STYLE_ID = 'task-terminal-styles';
const TASK_PRODUCT_MODELS = ['标准版', 'Pro版', '无线充新版'];
const TASK_PRIORITY_META = {
    normal: { label: '普通', shortLabel: '普通', color: '#4A90D9' },
    urgent: { label: '紧急', shortLabel: '紧急', color: '#f5222d' }
};
const TASK_STATUS_META = {
    waiting: { label: '等待', icon: '●', color: '#8c8c8c', group: 'waiting' },
    running: { label: '执行中', icon: '▶', color: '#52c41a', group: 'running' },
    paused: { label: '暂停', icon: '❙❙', color: '#faad14', group: 'exception' },
    completed: { label: '完成', icon: '✓', color: '#4A90D9', group: 'completed' },
    cancelled: { label: '取消', icon: '✕', color: '#f5222d', group: 'exception' },
    exception: { label: '异常', icon: '⚠', color: '#f5222d', group: 'exception' }
};
const TASK_LOG_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'task', label: '任务事件' },
    { key: 'alert', label: '警告/错误' }
];
const TASK_FILTER_TABS = [
    { key: 'all', label: '全部' },
    { key: 'waiting', label: '等待' },
    { key: 'running', label: '执行' },
    { key: 'completed', label: '完成' },
    { key: 'exception', label: '异常' }
];
const TASK_AGV_BASE = [
    { id: 'AGV#1', battery: 92, location: '上料位A', health: 'idle' },
    { id: 'AGV#2', battery: 76, location: '工位2', health: 'idle' },
    { id: 'AGV#3', battery: 63, location: '待命区', health: 'idle' },
    { id: 'AGV#4', battery: 48, location: '充电区', health: 'lowBattery' }
];

function ensureTaskTerminalStyles() {
    if (typeof document === 'undefined' || document.getElementById(TASK_TERMINAL_STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = TASK_TERMINAL_STYLE_ID;
    style.textContent = `
        .task-terminal-page {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .task-terminal-live {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(255,255,255,0.04);
            color: var(--color-text-secondary);
            font-size: 13px;
        }
        .task-terminal-live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-success);
            box-shadow: 0 0 8px rgba(82,196,26,0.5);
        }
        .task-terminal-summary {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
            gap: 16px;
            padding: 18px 20px;
        }
        .task-terminal-stat-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
        }
        .task-terminal-stat-card {
            padding: 14px 16px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .task-terminal-stat-label {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-bottom: 8px;
        }
        .task-terminal-stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--color-text);
            line-height: 1;
        }
        .task-terminal-stat-note {
            margin-top: 8px;
            color: var(--color-text-secondary);
            font-size: 12px;
        }
        .task-terminal-model-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: center;
            padding: 14px 16px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .task-terminal-section-title {
            font-size: 13px;
            letter-spacing: 0.4px;
            color: var(--color-text-secondary);
        }
        .task-terminal-model-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .task-terminal-model-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(74,144,217,0.1);
            color: var(--color-ice-white);
            font-size: 13px;
        }
        .task-terminal-model-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-primary);
        }
        .task-terminal-create {
            padding: 18px 20px;
        }
        .task-terminal-create.is-entry {
            border-color: rgba(74,144,217,0.4);
            box-shadow: 0 0 0 1px rgba(74,144,217,0.18), var(--glass-shadow);
        }
        .task-terminal-create-head,
        .task-terminal-panel-head,
        .task-terminal-log-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
        }
        .task-terminal-panel-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-text);
        }
        .task-terminal-panel-note {
            font-size: 13px;
            color: var(--color-text-secondary);
        }
        .task-terminal-create-grid {
            display: grid;
            grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 0.7fr) minmax(220px, 1fr) auto;
            gap: 14px;
            align-items: end;
        }
        .task-terminal-radio-group {
            display: inline-flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .task-terminal-radio {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            cursor: pointer;
            color: var(--color-text-secondary);
        }
        .task-terminal-radio.active {
            border-color: rgba(74,144,217,0.55);
            color: var(--color-text);
            background: rgba(74,144,217,0.12);
        }
        .task-terminal-radio-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid currentColor;
            display: inline-block;
        }
        .task-terminal-radio.active .task-terminal-radio-dot {
            background: currentColor;
        }
        .task-terminal-create-foot {
            margin-top: 10px;
            color: var(--color-text-secondary);
            font-size: 12px;
        }
        .task-terminal-main,
        .task-terminal-log {
            padding: 18px 20px;
        }
        .task-terminal-filter-tabs,
        .task-terminal-log-tabs,
        .task-terminal-batch {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
        }
        .task-terminal-filter-btn,
        .task-terminal-log-btn {
            padding: 8px 12px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px;
            background: rgba(255,255,255,0.03);
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: all var(--transition-fast);
            font-size: 13px;
        }
        .task-terminal-filter-btn.active,
        .task-terminal-log-btn.active {
            color: var(--color-text);
            background: rgba(74,144,217,0.14);
            border-color: rgba(74,144,217,0.45);
        }
        .task-terminal-batch {
            padding: 10px 12px;
            margin-bottom: 12px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .task-terminal-batch-text {
            color: var(--color-text-secondary);
            font-size: 13px;
            margin-right: auto;
        }
        .task-terminal-table-wrap {
            overflow: auto;
            border-radius: 12px;
        }
        .task-terminal-table {
            width: 100%;
            min-width: 1020px;
            border-collapse: collapse;
        }
        .task-terminal-table thead th {
            text-align: left;
            padding: 14px 12px;
            color: var(--color-text-secondary);
            font-size: 13px;
            font-weight: 500;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            white-space: nowrap;
        }
        .task-terminal-table tbody td {
            padding: 14px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            color: var(--color-text);
            vertical-align: middle;
        }
        .task-terminal-table tbody tr:hover {
            background: rgba(255,255,255,0.03);
        }
        .task-terminal-check {
            width: 16px;
            height: 16px;
            accent-color: var(--color-primary);
        }
        .task-terminal-id-btn,
        .task-terminal-sort-btn {
            background: transparent;
            border: none;
            color: inherit;
            cursor: pointer;
            font: inherit;
            padding: 0;
        }
        .task-terminal-id-btn {
            color: #9bc7ff;
        }
        .task-terminal-id-btn:hover,
        .task-terminal-sort-btn:hover {
            color: var(--color-text);
        }
        .task-terminal-sort-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .task-terminal-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            border: 1px solid transparent;
            font-size: 12px;
            white-space: nowrap;
        }
        .task-terminal-priority {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
        }
        .task-terminal-priority.urgent {
            color: #ff9aa2;
            background: rgba(245,34,45,0.12);
            border-color: rgba(245,34,45,0.28);
        }
        .task-terminal-progress {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 150px;
        }
        .task-terminal-progress-text {
            font-size: 13px;
        }
        .task-terminal-progress-bar {
            height: 8px;
            border-radius: 999px;
            background: rgba(255,255,255,0.08);
            overflow: hidden;
        }
        .task-terminal-progress-fill {
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, rgba(74,144,217,0.7), #52c41a);
            transition: width 260ms ease;
        }
        .task-terminal-progress-fill.running {
            animation: task-terminal-progress-pulse 1.6s infinite linear;
        }
        @keyframes task-terminal-progress-pulse {
            0% { filter: brightness(0.92); }
            50% { filter: brightness(1.12); }
            100% { filter: brightness(0.92); }
        }
        .task-terminal-agv {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .task-terminal-agv-meta {
            color: var(--color-text-secondary);
            font-size: 12px;
        }
        .task-terminal-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .task-terminal-action-btn {
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
            color: var(--color-text);
            font-size: 12px;
            cursor: pointer;
        }
        .task-terminal-action-btn:hover {
            background: rgba(255,255,255,0.08);
        }
        .task-terminal-action-btn.danger {
            color: #ff8f97;
        }
        .task-terminal-action-btn.info {
            color: #9bc7ff;
        }
        .task-terminal-empty {
            padding: 48px 20px;
            text-align: center;
            color: var(--color-text-secondary);
        }
        .task-terminal-log-body {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(260px, 0.7fr);
            gap: 16px;
        }
        .task-terminal-log-list {
            max-height: 260px;
            overflow: auto;
            padding-right: 4px;
        }
        .task-terminal-log-row {
            display: grid;
            grid-template-columns: 88px 80px minmax(0, 1fr);
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            font-size: 13px;
        }
        .task-terminal-log-row:last-child {
            border-bottom: none;
        }
        .task-terminal-log-time {
            color: var(--color-text-secondary);
        }
        .task-terminal-log-tag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(255,255,255,0.04);
            color: var(--color-text-secondary);
            font-size: 12px;
        }
        .task-terminal-log-tag.warning,
        .task-terminal-log-tag.error {
            color: #ffb86c;
            background: rgba(250,173,20,0.12);
        }
        .task-terminal-log-tag.error {
            color: #ff8f97;
            background: rgba(245,34,45,0.12);
        }
        .task-terminal-log-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            align-content: start;
        }
        .task-terminal-mini-card {
            padding: 14px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .task-terminal-mini-card .value {
            font-size: 24px;
            font-weight: 700;
            margin-top: 6px;
        }
        .task-terminal-collapse {
            background: transparent;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            font-size: 13px;
        }
        .task-terminal-flow-list,
        .task-terminal-timeline {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 12px;
        }
        .task-terminal-flow-item,
        .task-terminal-timeline-item {
            display: flex;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .task-terminal-flow-index {
            min-width: 54px;
            color: var(--color-text-secondary);
        }
        .task-terminal-flow-text {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .task-terminal-timeline-time {
            min-width: 140px;
            color: var(--color-text-secondary);
            font-size: 13px;
        }
        .task-terminal-detail-section + .task-terminal-detail-section {
            margin-top: 16px;
        }
        .task-terminal-log-empty {
            color: var(--color-text-secondary);
            padding: 28px 0;
            text-align: center;
        }
        @media (max-width: 1280px) {
            .task-terminal-summary,
            .task-terminal-log-body {
                grid-template-columns: 1fr;
            }
            .task-terminal-stat-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .task-terminal-create-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        @media (max-width: 900px) {
            .task-terminal-stat-grid,
            .task-terminal-log-summary,
            .task-terminal-create-grid {
                grid-template-columns: 1fr;
            }
            .task-terminal-create-head,
            .task-terminal-panel-head,
            .task-terminal-log-head {
                flex-direction: column;
                align-items: flex-start;
            }
            .task-terminal-log-row {
                grid-template-columns: 1fr;
                gap: 6px;
            }
        }
    `;
    document.head.appendChild(style);
}

ensureTaskTerminalStyles();

function taskToAlpha(hexColor, alpha) {
    const clean = String(hexColor || '').replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map((char) => char + char).join('')
        : clean;
    const num = parseInt(full || '000000', 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function cloneTaskData(value) {
    return JSON.parse(JSON.stringify(value));
}

function nowIso() {
    return new Date().toISOString();
}

function minutesAgo(minutes) {
    return new Date(Date.now() - minutes * 60000).toISOString();
}

function shiftIsoMinutes(baseIso, offsetMinutes) {
    return new Date(new Date(baseIso).getTime() + offsetMinutes * 60000).toISOString();
}

function taskStatusMeta(status) {
    return TASK_STATUS_META[status] || TASK_STATUS_META.waiting;
}

function taskPriorityMeta(priority) {
    return TASK_PRIORITY_META[priority] || TASK_PRIORITY_META.normal;
}

function createLogId() {
    return 'log-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
}

function createTimelineEvent(time, text, group, level) {
    return {
        id: createLogId(),
        time: time || nowIso(),
        text: text,
        group: group || 'task',
        level: level || 'info'
    };
}

function numericTaskId(taskId) {
    return Number(String(taskId || '').replace(/\D/g, '')) || 0;
}

function isTerminalStatus(status) {
    return status === 'completed' || status === 'cancelled';
}

function statusSortValue(status) {
    const order = {
        waiting: 1,
        running: 2,
        paused: 3,
        exception: 4,
        completed: 5,
        cancelled: 6
    };
    return order[status] || 99;
}

function matchesTaskFilter(task, filterKey) {
    if (filterKey === 'all') {
        return true;
    }
    const meta = taskStatusMeta(task.status);
    return meta.group === filterKey;
}

function buildUnitFlow(task) {
    const list = [];
    const currentStation = task.currentStation || '工位2';
    for (let index = 1; index <= task.quantity; index += 1) {
        let statusText = '待上线';
        if (task.status === 'completed') {
            statusText = '已完成下线';
        } else if (task.status === 'cancelled') {
            statusText = index <= task.completedUnits ? '已完成下线' : '已取消';
        } else if (index <= task.completedUnits) {
            statusText = '已完成下线';
        } else if (task.status === 'waiting') {
            statusText = '等待上线';
        } else if (task.status === 'running') {
            statusText = index === task.completedUnits + 1 ? '在' + currentStation + '加工' : '已上线待加工';
        } else if (task.status === 'paused') {
            statusText = index === task.completedUnits + 1 ? '任务暂停中' : '等待恢复';
        } else if (task.status === 'exception') {
            statusText = index === task.completedUnits + 1 ? currentStation + '处理异常' : '等待异常解除';
        }
        list.push({
            index: index,
            label: '单元' + String(index).padStart(2, '0'),
            statusText: statusText
        });
    }
    return list;
}

function createSeedTask(config) {
    const createdAt = minutesAgo(config.createdMinutesAgo);
    const task = {
        id: config.id,
        productModel: config.productModel,
        quantity: config.quantity,
        completedUnits: config.completedUnits || 0,
        priority: config.priority || 'normal',
        status: config.status || 'waiting',
        agvId: config.agvId || '',
        currentStation: config.currentStation || '工位2',
        remark: config.remark || '',
        createdAt: createdAt,
        startedAt: config.startedMinutesAgo != null ? minutesAgo(config.startedMinutesAgo) : '',
        finishedAt: config.finishedMinutesAgo != null ? minutesAgo(config.finishedMinutesAgo) : '',
        updatedAt: config.updatedMinutesAgo != null ? minutesAgo(config.updatedMinutesAgo) : createdAt,
        timeline: []
    };
    const timeline = [
        createTimelineEvent(createdAt, '任务创建', 'task', 'info')
    ];
    if (task.agvId) {
        timeline.push(createTimelineEvent(shiftIsoMinutes(createdAt, 2), '分配给 ' + task.agvId, 'task', 'info'));
    }
    if (task.startedAt) {
        timeline.push(createTimelineEvent(task.startedAt, '任务开始执行', 'task', 'info'));
    }
    if (task.completedUnits > 0) {
        timeline.push(createTimelineEvent(shiftIsoMinutes(task.startedAt || createdAt, 6), '已有 ' + task.completedUnits + ' 个单元完成下线', 'task', 'info'));
    }
    if (task.status === 'paused') {
        timeline.push(createTimelineEvent(task.updatedAt, '人工暂停任务，等待继续执行', 'task', 'warning'));
    }
    if (task.status === 'exception') {
        timeline.push(createTimelineEvent(task.updatedAt, '工位2发生超时，任务进入异常状态', 'alert', 'error'));
    }
    if (task.status === 'completed') {
        timeline.push(createTimelineEvent(task.finishedAt || task.updatedAt, '所有 ' + task.quantity + ' 个单元完成下线，任务结束', 'task', 'info'));
    }
    if (task.status === 'cancelled') {
        timeline.push(createTimelineEvent(task.finishedAt || task.updatedAt, '任务被人工取消', 'alert', 'warning'));
    }
    task.timeline = timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    task.units = buildUnitFlow(task);
    return task;
}

function buildSeedTasks() {
    return [
        createSeedTask({ id: 'T-023', productModel: '标准版', quantity: 3, completedUnits: 0, priority: 'urgent', status: 'waiting', createdMinutesAgo: 6, updatedMinutesAgo: 6, remark: '客户加急单' }),
        createSeedTask({ id: 'T-022', productModel: '无线充新版', quantity: 4, completedUnits: 1, priority: 'normal', status: 'exception', agvId: 'AGV#3', createdMinutesAgo: 18, startedMinutesAgo: 14, updatedMinutesAgo: 4, remark: '工位2超时待处理' }),
        createSeedTask({ id: 'T-021', productModel: 'Pro版', quantity: 2, completedUnits: 0, priority: 'normal', status: 'waiting', createdMinutesAgo: 22, updatedMinutesAgo: 22, remark: '待安排上线' }),
        createSeedTask({ id: 'T-020', productModel: '标准版', quantity: 6, completedUnits: 2, priority: 'normal', status: 'paused', agvId: 'AGV#2', createdMinutesAgo: 35, startedMinutesAgo: 31, updatedMinutesAgo: 11, remark: '暂停等待人工确认' }),
        createSeedTask({ id: 'T-019', productModel: 'Pro版', quantity: 5, completedUnits: 0, priority: 'urgent', status: 'waiting', createdMinutesAgo: 42, updatedMinutesAgo: 42, remark: '海外批次' }),
        createSeedTask({ id: 'T-018', productModel: '无线充新版', quantity: 4, completedUnits: 2, priority: 'normal', status: 'running', agvId: 'AGV#1', createdMinutesAgo: 58, startedMinutesAgo: 52, updatedMinutesAgo: 7, currentStation: '工位3', remark: '正常推进' }),
        createSeedTask({ id: 'T-017', productModel: '标准版', quantity: 3, completedUnits: 0, priority: 'normal', status: 'waiting', createdMinutesAgo: 75, updatedMinutesAgo: 75, remark: '' }),
        createSeedTask({ id: 'T-016', productModel: 'Pro版', quantity: 5, completedUnits: 5, priority: 'normal', status: 'completed', agvId: 'AGV#4', createdMinutesAgo: 160, startedMinutesAgo: 152, finishedMinutesAgo: 108, updatedMinutesAgo: 108, currentStation: '下线区', remark: '已归档' })
    ];
}

function buildSeedLogs(tasks) {
    return tasks
        .flatMap((task) => task.timeline.map((item) => ({
            id: item.id,
            taskId: task.id,
            time: item.time,
            text: task.id + ' ' + item.text,
            group: item.group,
            level: item.level
        })))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function buildAgvStore() {
    return TASK_AGV_BASE.map((item) => ({
        id: item.id,
        battery: item.battery,
        location: item.location,
        health: item.health,
        currentTask: '',
        busy: false
    }));
}

const taskSeed = buildSeedTasks();
const taskStore = Vue.reactive({
    tasks: taskSeed,
    agvs: buildAgvStore(),
    logs: buildSeedLogs(taskSeed),
    flash: null,
    nextTaskNumber: 24
});

let taskFlashTimer = null;

function pushTaskFlash(message, type) {
    taskStore.flash = {
        message: message,
        type: type || 'success',
        key: Date.now()
    };
    if (taskFlashTimer) {
        clearTimeout(taskFlashTimer);
    }
    taskFlashTimer = setTimeout(() => {
        taskStore.flash = null;
    }, 2200);
}

function syncTaskAgvs(store) {
    store.agvs.forEach((agv, index) => {
        const activeTask = store.tasks.find((task) => task.agvId === agv.id && !isTerminalStatus(task.status));
        agv.currentTask = activeTask ? activeTask.id : '';
        agv.busy = !!activeTask;
        if (agv.health !== 'lowBattery' && agv.health !== 'fault') {
            agv.location = activeTask ? (activeTask.currentStation || '产线中') : (index === 0 ? '待命区A' : index === 1 ? '待命区B' : index === 2 ? '缓冲区' : '充电区');
        }
    });
}

function appendTaskEvent(store, task, text, group, level, customTime) {
    const time = customTime || nowIso();
    const event = createTimelineEvent(time, text, group || 'task', level || 'info');
    task.timeline.push(event);
    store.logs.unshift({
        id: event.id,
        taskId: task.id,
        time: event.time,
        text: task.id + ' ' + text,
        group: event.group,
        level: event.level
    });
    task.updatedAt = event.time;
    task.units = buildUnitFlow(task);
}

function createNewTask(productModel, quantity, priority) {
    const createdAt = nowIso();
    const task = {
        id: 'T-' + String(taskStore.nextTaskNumber).padStart(3, '0'),
        productModel: productModel,
        quantity: quantity,
        completedUnits: 0,
        priority: priority,
        status: 'waiting',
        agvId: '',
        currentStation: '上料位',
        remark: priority === 'urgent' ? '紧急插单' : '',
        createdAt: createdAt,
        startedAt: '',
        finishedAt: '',
        updatedAt: createdAt,
        timeline: [
            createTimelineEvent(createdAt, '任务创建', 'task', 'info')
        ],
        units: []
    };
    task.units = buildUnitFlow(task);
    taskStore.nextTaskNumber += 1;
    return task;
}

syncTaskAgvs(taskStore);

function createTaskTerminalPage(entryMode) {
    return {
        template: `
        <div class="task-page task-terminal-page">
            <div v-if="flashMessage" class="task-toast" :class="'is-' + flashMessage.type">
                {{ flashMessage.message }}
            </div>

            <div class="page-title-bar">
                <div>
                    <div class="page-title">任务管理监控终端</div>
                    <div class="page-subtitle">生产订单创建、调度、执行与异常追踪一体化管理</div>
                </div>
                <div class="task-terminal-live">
                    <span class="task-terminal-live-dot"></span>
                    最近同步 {{ nowLabel }}
                </div>
            </div>

            <div class="task-terminal-summary glass-card">
                <div class="task-terminal-stat-grid">
                    <div v-for="card in summaryCards" :key="card.key" class="task-terminal-stat-card">
                        <div class="task-terminal-stat-label">{{ card.label }}</div>
                        <div class="task-terminal-stat-value" :style="{ color: card.color || 'var(--color-text)' }">{{ card.value }}</div>
                        <div class="task-terminal-stat-note">{{ card.note }}</div>
                    </div>
                </div>
                <div class="task-terminal-model-panel">
                    <div class="task-terminal-section-title">今日产品型号分布</div>
                    <div class="task-terminal-model-list">
                        <div v-for="item in modelDistribution" :key="item.label" class="task-terminal-model-chip">
                            <span class="task-terminal-model-dot"></span>
                            <span>{{ item.label }}: {{ item.count }}</span>
                        </div>
                    </div>
                    <div class="task-terminal-panel-note">任务创建后会立即出现在下方等待区顶部，开始执行时自动分配可用 AGV。</div>
                </div>
            </div>

            <div ref="createPanel" class="task-terminal-create glass-card" :class="{ 'is-entry': entryMode === 'create' }">
                <div class="task-terminal-create-head">
                    <div>
                        <div class="task-terminal-panel-title">创建新任务</div>
                        <div class="task-terminal-panel-note">按需求文档保留紧凑表单，仅录入产品型号、数量与优先级。</div>
                    </div>
                    <div class="task-terminal-panel-note">新任务默认进入等待队列，数量范围 1 - 99</div>
                </div>

                <div class="task-terminal-create-grid">
                    <label class="task-field">
                        <span class="task-field-label">产品型号</span>
                        <select v-model="createForm.productModel" class="task-input">
                            <option v-for="item in productOptions" :key="item" :value="item">{{ item }}</option>
                        </select>
                    </label>

                    <label class="task-field">
                        <span class="task-field-label">数量</span>
                        <input v-model.number="createForm.quantity" type="number" min="1" max="99" class="task-input" />
                    </label>

                    <div class="task-field">
                        <span class="task-field-label">优先级</span>
                        <div class="task-terminal-radio-group">
                            <button
                                v-for="item in priorityOptions"
                                :key="item.value"
                                type="button"
                                class="task-terminal-radio"
                                :class="{ active: createForm.priority === item.value }"
                                @click="createForm.priority = item.value"
                            >
                                <span class="task-terminal-radio-dot"></span>
                                <span>{{ item.label }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="task-field">
                        <button class="task-btn task-btn-primary" @click="submitCreateTask">确认创建</button>
                    </div>
                </div>

                <div class="task-terminal-create-foot">
                    双击任意任务行可查看详情；已完成、已取消任务仅保留“详情”操作。
                </div>
            </div>

            <div class="task-terminal-main glass-card">
                <div class="task-terminal-panel-head">
                    <div>
                        <div class="task-terminal-panel-title">任务列表主面板</div>
                        <div class="task-terminal-panel-note">共 {{ store.tasks.length }} 条任务，当前筛选后 {{ visibleTasks.length }} 条</div>
                    </div>
                    <div class="task-terminal-filter-tabs">
                        <button
                            v-for="tab in filterTabs"
                            :key="tab.key"
                            class="task-terminal-filter-btn"
                            :class="{ active: activeFilter === tab.key }"
                            @click="activeFilter = tab.key"
                        >
                            {{ tab.label }} {{ tab.count }}
                        </button>
                    </div>
                </div>

                <div v-if="selectedWaitingTasks.length" class="task-terminal-batch">
                    <div class="task-terminal-batch-text">已选中 {{ selectedWaitingTasks.length }} 个等待任务，可执行批量操作。</div>
                    <button class="task-btn task-btn-primary" @click="requestBatchAction('start')">批量开始</button>
                    <button class="task-btn" @click="requestBatchAction('cancel')">批量取消</button>
                    <button class="task-link-btn" @click="selectedIds = []">清空选择</button>
                </div>

                <div class="task-terminal-table-wrap">
                    <table class="task-terminal-table">
                        <thead>
                            <tr>
                                <th style="width: 36px;">
                                    <input class="task-terminal-check" type="checkbox" :checked="allVisibleWaitingSelected" @change="toggleAllWaiting($event)" />
                                </th>
                                <th>
                                    <button class="task-terminal-sort-btn" @click="toggleSort('id')">
                                        任务ID {{ sortMark('id') }}
                                    </button>
                                </th>
                                <th>产品型号</th>
                                <th>
                                    <button class="task-terminal-sort-btn" @click="toggleSort('status')">
                                        状态 {{ sortMark('status') }}
                                    </button>
                                </th>
                                <th>进度</th>
                                <th>执行AGV</th>
                                <th>
                                    <button class="task-terminal-sort-btn" @click="toggleSort('priority')">
                                        优先级 {{ sortMark('priority') }}
                                    </button>
                                </th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="task in visibleTasks" :key="task.id" @dblclick="openDetail(task)">
                                <td>
                                    <input
                                        class="task-terminal-check"
                                        type="checkbox"
                                        :disabled="task.status !== 'waiting'"
                                        :checked="selectedIds.includes(task.id)"
                                        @change="toggleTaskSelection(task, $event)"
                                    />
                                </td>
                                <td>
                                    <button class="task-terminal-id-btn" @click="openDetail(task)">{{ task.id }}</button>
                                </td>
                                <td>{{ task.productModel }}</td>
                                <td>
                                    <span class="task-terminal-status" :style="statusStyle(task.status)">
                                        {{ statusMeta(task.status).icon }} {{ statusMeta(task.status).label }}
                                    </span>
                                </td>
                                <td>
                                    <div class="task-terminal-progress">
                                        <div class="task-terminal-progress-text">{{ task.completedUnits }}/{{ task.quantity }}</div>
                                        <div class="task-terminal-progress-bar">
                                            <div
                                                class="task-terminal-progress-fill"
                                                :class="{ running: task.status === 'running' }"
                                                :style="{ width: progressPercent(task) + '%' }"
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="task-terminal-agv">
                                        <strong>{{ task.agvId || '--' }}</strong>
                                        <span class="task-terminal-agv-meta">{{ agvLabel(task) }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="task-terminal-priority" :class="{ urgent: task.priority === 'urgent' }">
                                        {{ priorityMeta(task.priority).shortLabel }}
                                    </span>
                                </td>
                                <td>{{ formatDateTime(task.createdAt) }}</td>
                                <td>
                                    <div class="task-terminal-actions">
                                        <button v-if="task.status === 'waiting'" class="task-terminal-action-btn info" @click="requestAction(task, 'start')">开始</button>
                                        <button v-if="task.status === 'running'" class="task-terminal-action-btn" @click="requestAction(task, 'pause')">暂停</button>
                                        <button v-if="task.status === 'paused' || task.status === 'exception'" class="task-terminal-action-btn info" @click="requestAction(task, 'resume')">继续</button>
                                        <button
                                            v-if="task.status === 'waiting' || task.status === 'running' || task.status === 'paused' || task.status === 'exception'"
                                            class="task-terminal-action-btn danger"
                                            @click="requestAction(task, 'cancel')"
                                        >
                                            取消
                                        </button>
                                        <button v-if="task.status === 'completed' || task.status === 'cancelled'" class="task-terminal-action-btn" @click="openDetail(task)">详情</button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="!visibleTasks.length">
                                <td colspan="9">
                                    <div class="task-terminal-empty">当前筛选条件下暂无任务。</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="task-terminal-log glass-card">
                <div class="task-terminal-log-head">
                    <div>
                        <div class="task-terminal-panel-title">运行日志面板</div>
                        <div class="task-terminal-panel-note">持续记录任务生命周期、资源调度、流程节点与异常信息。</div>
                    </div>
                    <div class="task-terminal-log-tabs">
                        <button
                            v-for="item in logFilters"
                            :key="item.key"
                            class="task-terminal-log-btn"
                            :class="{ active: activeLogFilter === item.key }"
                            @click="activeLogFilter = item.key"
                        >
                            {{ item.label }}
                        </button>
                        <button class="task-terminal-collapse" @click="logCollapsed = !logCollapsed">
                            {{ logCollapsed ? '展开日志' : '折叠日志' }}
                        </button>
                    </div>
                </div>

                <div v-if="!logCollapsed" class="task-terminal-log-body">
                    <div class="task-terminal-log-list">
                        <div v-for="item in filteredLogs" :key="item.id" class="task-terminal-log-row">
                            <div class="task-terminal-log-time">{{ formatLogTime(item.time) }}</div>
                            <div>
                                <span class="task-terminal-log-tag" :class="item.level">{{ logLabel(item) }}</span>
                            </div>
                            <div>{{ item.text }}</div>
                        </div>
                        <div v-if="!filteredLogs.length" class="task-terminal-log-empty">暂无对应日志。</div>
                    </div>

                    <div class="task-terminal-log-summary">
                        <div class="task-terminal-mini-card">
                            <div class="task-terminal-section-title">运行中任务</div>
                            <div class="value">{{ runningCount }}</div>
                        </div>
                        <div class="task-terminal-mini-card">
                            <div class="task-terminal-section-title">异常 / 暂停</div>
                            <div class="value">{{ exceptionCount }}</div>
                        </div>
                        <div class="task-terminal-mini-card">
                            <div class="task-terminal-section-title">可用 AGV</div>
                            <div class="value">{{ availableAgvCount }}</div>
                        </div>
                        <div class="task-terminal-mini-card">
                            <div class="task-terminal-section-title">今日完成率</div>
                            <div class="value">{{ completionRate }}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="detailTask" class="task-overlay" @click.self="detailTaskId = ''">
                <aside class="task-drawer task-detail-drawer glass-card">
                    <div class="task-drawer-header">
                        <div>
                            <div class="task-drawer-title">任务详情</div>
                            <div class="page-subtitle">{{ detailTask.id }}</div>
                        </div>
                        <button class="task-drawer-close" @click="detailTaskId = ''">×</button>
                    </div>

                    <div class="task-detail-grid">
                        <div class="task-detail-item"><span>任务ID</span><strong>{{ detailTask.id }}</strong></div>
                        <div class="task-detail-item"><span>产品型号</span><strong>{{ detailTask.productModel }}</strong></div>
                        <div class="task-detail-item"><span>状态</span><strong>{{ statusMeta(detailTask.status).label }}</strong></div>
                        <div class="task-detail-item"><span>优先级</span><strong>{{ priorityMeta(detailTask.priority).label }}</strong></div>
                        <div class="task-detail-item"><span>总数量</span><strong>{{ detailTask.quantity }}</strong></div>
                        <div class="task-detail-item"><span>执行AGV</span><strong>{{ detailTask.agvId || '--' }}</strong></div>
                        <div class="task-detail-item"><span>创建时间</span><strong>{{ formatDateTime(detailTask.createdAt) }}</strong></div>
                        <div class="task-detail-item"><span>总耗时</span><strong>{{ taskDuration(detailTask) }}</strong></div>
                        <div class="task-detail-item is-full"><span>备注</span><strong>{{ detailTask.remark || '无' }}</strong></div>
                    </div>

                    <div class="task-terminal-detail-section">
                        <div class="task-terminal-section-title">物料流</div>
                        <div class="task-terminal-flow-list">
                            <div v-for="unit in detailTask.units" :key="unit.label" class="task-terminal-flow-item">
                                <div class="task-terminal-flow-index">{{ unit.label }}</div>
                                <div class="task-terminal-flow-text">
                                    <strong>{{ detailTask.productModel }}</strong>
                                    <span>{{ unit.statusText }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="task-terminal-detail-section">
                        <div class="task-terminal-section-title">事件时间线</div>
                        <div class="task-terminal-timeline">
                            <div v-for="item in detailTask.timeline" :key="item.id" class="task-terminal-timeline-item">
                                <div class="task-terminal-timeline-time">{{ formatDateTime(item.time) }}</div>
                                <div>{{ item.text }}</div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <div v-if="confirmDialog.open" class="task-overlay" @click.self="closeConfirm">
                <div class="task-modal glass-card">
                    <div class="task-modal-title">{{ confirmDialog.title }}</div>
                    <div class="task-modal-text">{{ confirmDialog.message }}</div>
                    <div class="task-modal-actions">
                        <button class="task-btn" @click="closeConfirm">取消</button>
                        <button class="task-btn task-btn-primary" @click="runConfirmHandler">确认</button>
                    </div>
                </div>
            </div>
        </div>
        `,

        data() {
            return {
                entryMode: entryMode,
                store: taskStore,
                nowTick: Date.now(),
                activeFilter: 'all',
                sortKey: 'id',
                sortOrder: 'desc',
                activeLogFilter: 'all',
                logCollapsed: false,
                createForm: {
                    productModel: '标准版',
                    quantity: 1,
                    priority: 'normal'
                },
                selectedIds: [],
                detailTaskId: '',
                confirmDialog: {
                    open: false,
                    title: '',
                    message: '',
                    handler: null
                },
                simulationTimer: null,
                clockTimer: null,
                simulationStep: 0
            };
        },

        computed: {
            flashMessage() {
                return this.store.flash;
            },

            nowLabel() {
                return new Date(this.nowTick).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            },

            productOptions() {
                return TASK_PRODUCT_MODELS;
            },

            priorityOptions() {
                return Object.keys(TASK_PRIORITY_META).map((key) => ({
                    value: key,
                    label: TASK_PRIORITY_META[key].label
                }));
            },

            summaryCards() {
                return [
                    { key: 'total', label: '总任务', value: this.store.tasks.length, note: '当前在系统中的全部订单任务' },
                    { key: 'running', label: '执行中', value: this.runningCount, note: '已进入产线处理流程', color: '#52c41a' },
                    { key: 'waiting', label: '等待中', value: this.waitingCount, note: '待系统调度或人工开始', color: '#A8B2BE' },
                    { key: 'completed', label: '已完成', value: this.completedCount, note: '本轮流程已结束', color: '#7bb6ff' },
                    { key: 'exception', label: '异常', value: this.exceptionCount, note: '包含异常、暂停、取消状态', color: '#ff8f97' }
                ];
            },

            modelDistribution() {
                const todayKey = new Date().toDateString();
                return TASK_PRODUCT_MODELS.map((name) => ({
                    label: name,
                    count: this.store.tasks.filter((task) => task.productModel === name && new Date(task.createdAt).toDateString() === todayKey).length
                }));
            },

            filterTabs() {
                return TASK_FILTER_TABS.map((tab) => ({
                    key: tab.key,
                    label: tab.label,
                    count: this.store.tasks.filter((task) => matchesTaskFilter(task, tab.key)).length
                }));
            },

            sortedTasks() {
                const multiplier = this.sortOrder === 'asc' ? 1 : -1;
                return this.store.tasks.slice().sort((a, b) => {
                    if (this.sortKey === 'id') {
                        return (numericTaskId(a.id) - numericTaskId(b.id)) * multiplier;
                    }
                    if (this.sortKey === 'status') {
                        return (statusSortValue(a.status) - statusSortValue(b.status)) * multiplier;
                    }
                    if (this.sortKey === 'priority') {
                        const aValue = a.priority === 'urgent' ? 2 : 1;
                        const bValue = b.priority === 'urgent' ? 2 : 1;
                        if (aValue !== bValue) {
                            return (aValue - bValue) * multiplier;
                        }
                    }
                    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * -1;
                });
            },

            visibleTasks() {
                return this.sortedTasks.filter((task) => matchesTaskFilter(task, this.activeFilter));
            },

            allVisibleWaitingIds() {
                return this.visibleTasks.filter((task) => task.status === 'waiting').map((task) => task.id);
            },

            allVisibleWaitingSelected() {
                return this.allVisibleWaitingIds.length > 0 && this.allVisibleWaitingIds.every((id) => this.selectedIds.includes(id));
            },

            selectedWaitingTasks() {
                return this.store.tasks.filter((task) => this.selectedIds.includes(task.id) && task.status === 'waiting');
            },

            detailTask() {
                return this.store.tasks.find((task) => task.id === this.detailTaskId) || null;
            },

            logFilters() {
                return TASK_LOG_FILTERS;
            },

            filteredLogs() {
                return this.store.logs.filter((item) => {
                    if (this.activeLogFilter === 'task') {
                        return item.group === 'task';
                    }
                    if (this.activeLogFilter === 'alert') {
                        return item.level === 'warning' || item.level === 'error' || item.group === 'alert';
                    }
                    return true;
                }).slice(0, 24);
            },

            runningCount() {
                return this.store.tasks.filter((task) => task.status === 'running').length;
            },

            waitingCount() {
                return this.store.tasks.filter((task) => task.status === 'waiting').length;
            },

            completedCount() {
                return this.store.tasks.filter((task) => task.status === 'completed').length;
            },

            exceptionCount() {
                return this.store.tasks.filter((task) => task.status === 'paused' || task.status === 'exception' || task.status === 'cancelled').length;
            },

            availableAgvCount() {
                return this.store.agvs.filter((agv) => !agv.busy && agv.health !== 'fault').length;
            },

            completionRate() {
                if (!this.store.tasks.length) {
                    return 0;
                }
                return Math.round((this.completedCount / this.store.tasks.length) * 100);
            }
        },

        watch: {
            activeFilter() {
                this.pruneSelection();
            }
        },

        mounted() {
            this.clockTimer = setInterval(() => {
                this.nowTick = Date.now();
            }, 1000);
            this.simulationTimer = setInterval(() => {
                this.runSimulationTick();
            }, 6000);
            if (this.entryMode === 'create') {
                this.$nextTick(() => {
                    if (this.$refs.createPanel && typeof this.$refs.createPanel.scrollIntoView === 'function') {
                        this.$refs.createPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }
        },

        beforeUnmount() {
            if (this.clockTimer) {
                clearInterval(this.clockTimer);
            }
            if (this.simulationTimer) {
                clearInterval(this.simulationTimer);
            }
        },

        methods: {
            statusMeta(status) {
                return taskStatusMeta(status);
            },

            priorityMeta(priority) {
                return taskPriorityMeta(priority);
            },

            statusStyle(status) {
                const meta = this.statusMeta(status);
                return {
                    color: meta.color,
                    backgroundColor: taskToAlpha(meta.color, 0.12),
                    borderColor: taskToAlpha(meta.color, 0.28)
                };
            },

            progressPercent(task) {
                if (!task.quantity) {
                    return 0;
                }
                return Math.max(0, Math.min(100, Math.round((task.completedUnits / task.quantity) * 100)));
            },

            agvLabel(task) {
                if (!task.agvId) {
                    return '未分配';
                }
                const agv = this.store.agvs.find((item) => item.id === task.agvId);
                if (!agv) {
                    return '已分配';
                }
                if (agv.health === 'lowBattery') {
                    return '低电量';
                }
                if (agv.health === 'fault') {
                    return '故障';
                }
                return agv.busy ? '执行中' : '空闲';
            },

            sortMark(key) {
                if (this.sortKey !== key) {
                    return '';
                }
                return this.sortOrder === 'asc' ? '↑' : '↓';
            },

            toggleSort(key) {
                if (this.sortKey === key) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                    return;
                }
                this.sortKey = key;
                this.sortOrder = 'desc';
            },

            toggleTaskSelection(task, event) {
                if (task.status !== 'waiting') {
                    return;
                }
                if (event.target.checked) {
                    if (!this.selectedIds.includes(task.id)) {
                        this.selectedIds.push(task.id);
                    }
                    return;
                }
                this.selectedIds = this.selectedIds.filter((id) => id !== task.id);
            },

            toggleAllWaiting(event) {
                if (event.target.checked) {
                    this.selectedIds = Array.from(new Set(this.selectedIds.concat(this.allVisibleWaitingIds)));
                    return;
                }
                this.selectedIds = this.selectedIds.filter((id) => !this.allVisibleWaitingIds.includes(id));
            },

            pruneSelection() {
                this.selectedIds = this.selectedIds.filter((id) => this.store.tasks.some((task) => task.id === id && task.status === 'waiting'));
            },

            submitCreateTask() {
                const quantity = Number(this.createForm.quantity);
                if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
                    pushTaskFlash('数量需在 1 到 99 之间', 'error');
                    return;
                }
                const task = createNewTask(this.createForm.productModel, Math.round(quantity), this.createForm.priority);
                taskStore.tasks.unshift(cloneTaskData(task));
                appendTaskEvent(taskStore, taskStore.tasks[0], '任务已进入等待队列顶部', 'task', 'info', task.createdAt);
                pushTaskFlash('任务创建成功，已进入等待队列', 'success');
                this.createForm.quantity = 1;
                if (this.$route && this.$route.path === '/tasks/create') {
                    this.$router.push('/tasks');
                }
            },

            openDetail(task) {
                this.detailTaskId = task.id;
            },

            closeConfirm() {
                this.confirmDialog.open = false;
                this.confirmDialog.handler = null;
            },

            runConfirmHandler() {
                if (typeof this.confirmDialog.handler === 'function') {
                    this.confirmDialog.handler();
                }
            },

            requestAction(task, action) {
                const titles = {
                    start: '确认开始任务',
                    pause: '确认暂停任务',
                    resume: '确认继续任务',
                    cancel: '确认取消任务'
                };
                const messages = {
                    start: '任务 ' + task.id + ' 将进入执行状态，并自动分配可用 AGV。',
                    pause: '任务 ' + task.id + ' 将被暂停，进度会保留。',
                    resume: '任务 ' + task.id + ' 将恢复执行。',
                    cancel: '任务 ' + task.id + ' 将被取消，且会写入历史记录。'
                };
                this.confirmDialog = {
                    open: true,
                    title: titles[action],
                    message: messages[action],
                    handler: () => {
                        this.closeConfirm();
                        if (action === 'start') {
                            this.startTask(task);
                        } else if (action === 'pause') {
                            this.pauseTask(task);
                        } else if (action === 'resume') {
                            this.resumeTask(task);
                        } else if (action === 'cancel') {
                            this.cancelTask(task);
                        }
                    }
                };
            },

            requestBatchAction(action) {
                const label = action === 'start' ? '批量开始' : '批量取消';
                const tasks = this.selectedWaitingTasks.slice();
                if (!tasks.length) {
                    return;
                }
                this.confirmDialog = {
                    open: true,
                    title: label,
                    message: '确认对 ' + tasks.length + ' 个等待任务执行“' + label + '”？',
                    handler: () => {
                        this.closeConfirm();
                        tasks.forEach((task) => {
                            if (action === 'start') {
                                this.startTask(task, true);
                            } else {
                                this.cancelTask(task, true);
                            }
                        });
                        this.selectedIds = [];
                        pushTaskFlash(label + '已执行', 'success');
                    }
                };
            },

            pickAvailableAgv() {
                const busyIds = new Set(this.store.tasks.filter((task) => !isTerminalStatus(task.status) && task.agvId).map((task) => task.agvId));
                return this.store.agvs
                    .filter((agv) => !busyIds.has(agv.id) && agv.health !== 'fault')
                    .sort((a, b) => {
                        const aWeight = a.health === 'lowBattery' ? 0 : 1;
                        const bWeight = b.health === 'lowBattery' ? 0 : 1;
                        if (aWeight !== bWeight) {
                            return bWeight - aWeight;
                        }
                        return b.battery - a.battery;
                    })[0] || null;
            },

            startTask(task, silent) {
                if (task.status !== 'waiting') {
                    return;
                }
                const agv = this.pickAvailableAgv();
                if (!agv) {
                    pushTaskFlash('暂无可用 AGV，任务保持等待状态', 'warning');
                    return;
                }
                task.agvId = agv.id;
                task.status = 'running';
                task.startedAt = task.startedAt || nowIso();
                task.currentStation = task.currentStation === '上料位' ? '工位1' : task.currentStation;
                appendTaskEvent(this.store, task, '已分配给 ' + agv.id, 'task', 'info');
                appendTaskEvent(this.store, task, '任务开始执行', 'task', 'info');
                syncTaskAgvs(this.store);
                this.pruneSelection();
                if (!silent) {
                    pushTaskFlash('任务已开始执行', 'success');
                }
            },

            pauseTask(task) {
                if (task.status !== 'running') {
                    return;
                }
                task.status = 'paused';
                appendTaskEvent(this.store, task, '任务已暂停，等待人工继续', 'task', 'warning');
                syncTaskAgvs(this.store);
                pushTaskFlash('任务已暂停', 'info');
            },

            resumeTask(task) {
                if (task.status !== 'paused' && task.status !== 'exception') {
                    return;
                }
                if (!task.agvId) {
                    const agv = this.pickAvailableAgv();
                    if (!agv) {
                        pushTaskFlash('暂无可用 AGV，无法继续该任务', 'warning');
                        return;
                    }
                    task.agvId = agv.id;
                    appendTaskEvent(this.store, task, '恢复执行时重新分配给 ' + agv.id, 'task', 'info');
                }
                task.status = 'running';
                appendTaskEvent(this.store, task, '任务恢复执行', 'task', 'info');
                syncTaskAgvs(this.store);
                pushTaskFlash('任务已恢复执行', 'success');
            },

            cancelTask(task, silent) {
                if (isTerminalStatus(task.status)) {
                    return;
                }
                task.status = 'cancelled';
                task.finishedAt = nowIso();
                appendTaskEvent(this.store, task, '任务已取消', 'alert', 'warning', task.finishedAt);
                syncTaskAgvs(this.store);
                this.pruneSelection();
                if (!silent) {
                    pushTaskFlash('任务已取消', 'error');
                }
            },

            completeTask(task) {
                task.status = 'completed';
                task.completedUnits = task.quantity;
                task.currentStation = '下线区';
                task.finishedAt = nowIso();
                appendTaskEvent(this.store, task, '所有 ' + task.quantity + ' 个单元完成下线，任务结束', 'task', 'info', task.finishedAt);
                syncTaskAgvs(this.store);
            },

            formatDateTime(value) {
                if (!value) {
                    return '--';
                }
                return new Date(value).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            },

            formatLogTime(value) {
                return new Date(value).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            },

            logLabel(item) {
                if (item.level === 'error') {
                    return '异常';
                }
                if (item.level === 'warning') {
                    return '警告';
                }
                return item.group === 'task' ? '任务事件' : '系统';
            },

            taskDuration(task) {
                const end = task.finishedAt || nowIso();
                const diffMinutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(task.createdAt).getTime()) / 60000));
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                if (!hours) {
                    return minutes + ' 分钟';
                }
                return hours + ' 小时 ' + minutes + ' 分钟';
            },

            runSimulationTick() {
                this.simulationStep += 1;
                const runningTasks = this.store.tasks.filter((task) => task.status === 'running');
                if (runningTasks.length) {
                    const target = runningTasks[this.simulationStep % runningTasks.length];
                    if (target.completedUnits < target.quantity) {
                        target.completedUnits += 1;
                        target.currentStation = target.completedUnits >= target.quantity ? '下线区' : '工位' + Math.min(4, target.completedUnits + 1);
                        appendTaskEvent(this.store, target, '第 ' + target.completedUnits + ' 个单元完成下线', 'task', 'info');
                        if (target.completedUnits >= target.quantity) {
                            this.completeTask(target);
                            pushTaskFlash(target.id + ' 已完成', 'success');
                        } else {
                            syncTaskAgvs(this.store);
                        }
                    }
                }

                if (this.simulationStep % 4 === 0) {
                    const candidate = this.store.tasks.find((task) => task.status === 'running' && task.completedUnits < task.quantity);
                    if (candidate) {
                        candidate.status = 'exception';
                        appendTaskEvent(this.store, candidate, candidate.currentStation + ' 发生超时，任务已转为异常', 'alert', 'error');
                        syncTaskAgvs(this.store);
                    }
                }
            }
        }
    };
}

const tasksPage = createTaskTerminalPage('list');
const taskCreatePage = createTaskTerminalPage('create');

window.tasksPage = tasksPage;
window.taskCreatePage = taskCreatePage;
