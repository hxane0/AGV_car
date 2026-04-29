/**
 * 全局事件流：任务运行日志等模块推送，事件日志页订阅（不依赖 WebSocket，同标签页内实时）
 */
(function (global) {
    var MAX = 600;
    var buffer = [];
    var subs = [];

    function pushTaskLog(entry) {
        if (!entry || !entry.id) return;
        var item = {
            type: 'task_log',
            id: entry.id,
            taskId: entry.taskId,
            time: entry.time,
            text: entry.text,
            group: entry.group,
            level: entry.level
        };
        buffer.unshift(item);
        if (buffer.length > MAX) buffer.length = MAX;
        subs.forEach(function (cb) {
            try {
                cb(item);
            } catch (e) {}
        });
    }

    function getRecent(n) {
        return buffer.slice(0, Math.min(n || 200, buffer.length));
    }

    function subscribe(cb) {
        if (typeof cb !== 'function') return function () {};
        subs.push(cb);
        return function () {
            subs = subs.filter(function (x) {
                return x !== cb;
            });
        };
    }

    function isEmpty() {
        return buffer.length === 0;
    }

    function seedFromTaskLogs(logs) {
        if (!logs || !logs.length) return;
        for (var i = logs.length - 1; i >= 0; i -= 1) {
            pushTaskLog(logs[i]);
        }
    }

    global.jiemianEventStream = {
        pushTaskLog: pushTaskLog,
        getRecent: getRecent,
        subscribe: subscribe,
        isEmpty: isEmpty,
        seedFromTaskLogs: seedFromTaskLogs
    };
})(typeof window !== 'undefined' ? window : globalThis);
