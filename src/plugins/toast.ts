import Toast, { PluginOptions, POSITION } from 'vue-toastification';
import { App } from 'vue';

const options: PluginOptions = {
    transition: "Vue-Toastification__fade",
    maxToasts: 5,
    newestOnTop: true,
    position: POSITION.BOTTOM_RIGHT,
    timeout: 5000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
};

export default {
    install: (app: App): void => {
        app.use(Toast, options);
    }
}