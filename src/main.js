import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Bootstrap & Bootstrap Icons
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Global Custom Smartboard Styles
import './assets/main.css';

const app = createApp(App);

app.use(router);

app.mount('#app');
