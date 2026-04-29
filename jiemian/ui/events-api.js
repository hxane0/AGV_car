/**
 * 事件日志 API（事件日志部分ui.md 11.1）
 */
(function (global) {
    function apiRoot() {
        if (typeof variables !== 'undefined' && variables.MATERIAL_API_BASE) {
            return String(variables.MATERIAL_API_BASE).replace(/\/+$/, '');
        }
        return 'http://127.0.0.1:8000';
    }

    function buildUrl(path, query) {
        var u = new URL(path, apiRoot());
        if (query && typeof query === 'object') {
            Object.keys(query).forEach(function (k) {
                var v = query[k];
                if (v !== undefined && v !== null && v !== '') {
                    u.searchParams.set(k, v);
                }
            });
        }
        return u.toString();
    }

    async function requestJson(url) {
        var res = await fetch(url, { headers: { Accept: 'application/json' } });
        var text = await res.text();
        var data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            data = { _raw: text };
        }
        if (!res.ok) {
            var err = new Error((data && (data.message || data.error)) || res.statusText);
            err.status = res.status;
            err.body = data;
            throw err;
        }
        return data;
    }

    global.EventsLogAPI = {
        getList: function (params) {
            return requestJson(
                buildUrl('/api/events', {
                    level: params && params.level,
                    module: params && params.module,
                    start_time: params && params.start_time,
                    end_time: params && params.end_time,
                    limit: (params && params.limit) || 100,
                    agv_id: params && params.agv_id,
                    task_id: params && params.task_id
                })
            );
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
