#!/usr/bin/env node
import {access, cp} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

const entry = new URL('../dist/cli/main.js', import.meta.url)
if (process.argv[2] === 'dev') {
  await cp(new URL('../skills', import.meta.url), new URL('../dist/skills', import.meta.url), {
    recursive: true,
  })
  const {build} = await import('vite')
  await build({
    build: {
      emptyOutDir: false,
      minify: false,
      outDir: fileURLToPath(new URL('../dist/cli', import.meta.url)),
      ssr: fileURLToPath(new URL('../src/cli/main.ts', import.meta.url)),
      target: 'node24',
    },
    configFile: false,
    logLevel: 'warn',
  })
}
try {
  await access(entry)
} catch {
  process.stderr.write('먼저 pnpm --filter @winter-love/poffo build를 실행하세요.\n')
  process.exitCode = 1
}
if (process.exitCode !== 1) {
  await import(entry.href)
}
