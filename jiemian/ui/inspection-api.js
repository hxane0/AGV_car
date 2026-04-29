/**
 * 物料检测与绑定 - 接口封装（对应 ui要求.md）
 * 依赖：先加载 variables.js（可选），否则使用默认地址
 */
(function (global) {
    function materialBase() {
        if (typeof variables !== 'undefined' && variables.MATERIAL_API_BASE) {
            return String(variables.MATERIAL_API_BASE).replace(/\/+$/, '');
        }
        return 'http://127.0.0.1:8000';
    }

    const paths = {
        bind: '/api/material/bind',
        history: '/api/material/history',
        redetect: '/api/material/redetect',
        forcePass: '/api/material/force-pass',
        exportHistory: '/api/material/history/export'
    };

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

    function buildUrl(path, query) {
        const u = new URL(path, materialBase());
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

    global.MaterialInspectionAPI = {
        getBase: materialBase,

        bind: function (payload) {
            return requestJson(buildUrl(paths.bind), {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },

        getHistory: function (params) {
            return requestJson(
                buildUrl(paths.history, {
                    limit: (params && params.limit) || 10,
                    status: (params && params.status) || 'all',
                    start_time: params && params.start_time,
                    end_time: params && params.end_time
                }),
                { method: 'GET' }
            );
        },

        redetect: function (body) {
            return requestJson(buildUrl(paths.redetect), {
                method: 'POST',
                body: JSON.stringify(body || {})
            });
        },

        forcePass: function (body) {
            return requestJson(buildUrl(paths.forcePass), {
                method: 'POST',
                body: JSON.stringify(body || {})
            });
        },

        exportHistory: function (params) {
            return requestJson(buildUrl(paths.exportHistory, params || {}), { method: 'GET' });
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
