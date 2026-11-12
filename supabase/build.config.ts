import { defineConfig } from 'vite';

// Bundle the same save validator, name filter and scores used by the game for Supabase's Deno runtime.
export default defineConfig({
  build: {
    target: 'esnext', outDir: 'work/online-edge', emptyOutDir: true, minify: 'oxc',
    lib: { entry: 'supabase/functions/leap-online/index.ts', formats: ['es'], fileName: () => 'index.js' },
  },
});
