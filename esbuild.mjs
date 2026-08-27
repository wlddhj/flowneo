import { build } from 'esbuild'

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
}

await build({
  ...shared,
  entryPoints: {
    'hooks/session-start': 'src/hooks/session-start.ts',
    'hooks/user-prompt-submit': 'src/hooks/user-prompt-submit.ts',
    'hooks/post-tool-use': 'src/hooks/post-tool-use.ts',
  },
  outdir: 'dist',
})

await build({
  ...shared,
  entryPoints: { cli: 'src/cli/main.ts' },
  outdir: 'dist',
  banner: { js: '#!/usr/bin/env node' },
})
