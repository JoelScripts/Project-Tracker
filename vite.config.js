import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the port and refuse to drift.
    //
    // localStorage is keyed by ORIGIN, and the origin includes the port. With
    // a soft port, Vite quietly slides to the next free one whenever this one
    // is taken — which it does on every server restart triggered by a source
    // edit. The board then looks like an empty app, because it just re-seeds
    // the demo content under an origin that has never had your data.
    //
    // strictPort makes Vite fail loudly instead of moving, so the origin stays
    // put and the stored board stays reachable.
    port: 5174,
    strictPort: true,
    open: false,
  },
});
