/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './styles/index.css';
import 'vue-toastification/dist/index.css';
import './styles/notification.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import toastPlugin from './plugins/toast';
import pinia from './plugins/pinia';
import { setServerReachable } from './services/offline/offlineInterceptor';

const app = createApp(App);
app.use(router);
app.use(toastPlugin);
app.use(pinia);

// Keep the renderer alive when components throw (network failures during render,
// undefined data after a backend disconnect, etc.). Without this Vue can blank
// the affected subtree and the user sees the bare surface background.
app.config.errorHandler = (err, _instance, info) => {
  console.warn('[vue:error]', info, err);
};

// Treat unhandled axios rejections (typically from offline mutations) as offline
// rather than letting them bubble into "uncaught" warnings. Also marks the
// backend as unreachable so the UI swaps to offline mode immediately.
window.addEventListener('unhandledrejection', (event) => {
  const reason: any = event.reason;
  const isAxiosNetworkError =
    reason && (reason.isAxiosError || reason.config) && !reason.response;
  if (isAxiosNetworkError) {
    setServerReachable(false);
    event.preventDefault();
  }
});

app.mount('#app');
