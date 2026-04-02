const routes = [
    { path: '/', component: window.home },
    { path: '/map', component: window.map },
    { path: '/agv', component: window.agv },
    { path: '/tasks/create', component: window.taskCreatePage },
    { path: '/tasks', component: window.tasksPage },
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
            if (!this.$route) {
                return false;
            }
            if (path === '/') {
                return this.$route.path === '/';
            }
            return this.$route.path === path || this.$route.path.indexOf(path + '/') === 0;
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
