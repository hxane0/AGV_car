/**
 * 生产任务持久化 API（Django /api/v1/tasks）
 * 依赖：先加载 variables.js（可选 MATERIAL_API_BASE）
 */
(function (global) {
    function apiBase() {
        if (typeof variables !== 'undefined' && variables.MATERIAL_API_BASE) {
            return String(variables.MATERIAL_API_BASE).replace(/\/+$/, '');
        }
        return 'http://127.0.0.1:8000';
    }

    async function requestJson(url, options) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
            ...(options || {})
        });
        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = { _raw: text };
        }
        if (!res.ok) {
            const err = new Error((data && (data.message || data.error)) || res.statusText || '请求失败');
            err.status = res.status;
            err.body = data;
            throw err;
        }
        return data;
    }

    function serializeTask(task) {
        if (!task || !task.id) {
            return null;
        }
        return {
            id: task.id,
            productModel: task.productModel,
            quantity: task.quantity,
            completedUnits: task.completedUnits,
            priority: task.priority,
            status: task.status,
            agvId: task.agvId,
            currentStation: task.currentStation,
            remark: task.remark,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            finishedAt: task.finishedAt,
            updatedAt: task.updatedAt,
            timeline: Array.isArray(task.timeline) ? task.timeline : []
        };
    }

    function fetchTasks() {
        return requestJson(apiBase() + '/api/v1/tasks');
    }

    function createTask(task) {
        const body = serializeTask(task);
        if (!body) {
            return Promise.reject(new Error('无效任务'));
        }
        return requestJson(apiBase() + '/api/v1/tasks', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    function saveTask(task) {
        const body = serializeTask(task);
        if (!body) {
            return Promise.reject(new Error('无效任务'));
        }
        const id = encodeURIComponent(body.id);
        return requestJson(apiBase() + '/api/v1/tasks/' + id, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    global.taskApi = {
        apiBase: apiBase,
        fetchTasks: fetchTasks,
        createTask: createTask,
        saveTask: saveTask,
        serializeTask: serializeTask
    };
})(typeof window !== 'undefined' ? window : this);
