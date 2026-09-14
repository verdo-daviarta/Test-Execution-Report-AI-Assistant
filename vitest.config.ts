import { defineConfig } from 'vitest/config';

// Tests load backend modules directly; they must not inherit the browser file denylist.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node' },
});
