// frontend/vite.config.js
import {
    defineConfig
} from 'vite';

export default defineConfig({
    server: {
        port: 3000, // Frontend akan jalan di port 3000
        open: true // Auto open browser
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    }
});