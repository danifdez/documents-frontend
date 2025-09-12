import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig({
    plugins: [vue()],
    // PostCSS configuration is in postcss.config.js
});
