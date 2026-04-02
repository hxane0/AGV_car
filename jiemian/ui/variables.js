const variables = {
    API_URL: "http://127.0.0.1:8000/api/v1/",
    WS_URL: "ws://127.0.0.1:8000/ws",
    PHOTO_URL: "http://127.0.0.1:8000/static/",
    AGV_POLL_INTERVAL_MS: 1000,
    SIMULATION_MODE: true,
    /** 地图监控与 AGV 管理页共用的 GLB 路径（相对当前页面 URL） */
    AGVCAR_MODEL_URL: "AGVCARglb.glb",
    /** 地图点击 AGV 跳转详情时 sessionStorage 键名 */
    MAP_AGV_NAV_STORAGE_KEY: "jiemian_map_agv_nav"
};

variables.AGV_SHARED_STATE = (() => {
    let agvList = [];
    let updatedAt = 0;
    const listeners = new Set();

    function cloneItem(item) {
        return item ? { ...item } : item;
    }

    function snapshot() {
        return {
            list: agvList.map(cloneItem),
            updatedAt
        };
    }

    function notify() {
        const nextSnapshot = snapshot();
        listeners.forEach((listener) => {
            try {
                listener(nextSnapshot);
            } catch (error) {
                /* ignore listener errors */
            }
        });
    }

    return {
        publish(list) {
            agvList = Array.isArray(list) ? list.map(cloneItem) : [];
            updatedAt = Date.now();
            notify();
        },
        getList() {
            return agvList.map(cloneItem);
        },
        getById(agvId) {
            const target = String(agvId || '');
            const item = agvList.find((agv) => String(agv.id) === target);
            return cloneItem(item);
        },
        subscribe(listener) {
            if (typeof listener !== 'function') {
                return () => {};
            }
            listeners.add(listener);
            listener(snapshot());
            return () => {
                listeners.delete(listener);
            };
        }
    };
})();
