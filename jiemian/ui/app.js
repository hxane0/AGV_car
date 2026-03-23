const routes = [
    { path: '/', component: window.home },
    { path: '/map', component: window.map },
    { path: '/agv', component: window.agv },
    { path: '/home', redirect: '/' }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes
});

const app = Vue.createApp({
    data() {
        return {
            sidebarCollapsed: false
        };
    },
    methods: {
        isRouteActive(path) {
            return this.$route && this.$route.path === path;
        },
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            this.$nextTick(() => {
                window.dispatchEvent(new Event('resize'));
            });
        }
    }
});

app.use(router);
app.mount('#app');
