/** @vitest-environment node */
import {fileURLToPath} from 'node:url'
import {createContext, runInContext} from 'node:vm'
import {build} from 'vite'
import {expect, it} from 'vitest'
import {BROWSER_BUILD_TARGETS} from '../../scripts/vite/browser-targets'
import {createPolyfillsPlugin} from '../../scripts/vite/polyfills'

it.each([1, 2])('should run without native Promise.withResolvers in client build %i', async () => {
  const result = await build({
    build: {
      lib: {
        entry: fileURLToPath(
          new URL('../../src/utils/create-latest-async-task/index.ts', import.meta.url),
        ),
        formats: ['iife'],
        name: 'TaskUtility',
      },
      target: BROWSER_BUILD_TARGETS,
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    plugins: [createPolyfillsPlugin()],
    root: fileURLToPath(new URL('../../', import.meta.url)),
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((output) =>
    'output' in output ? output.output : [],
  )
  const code = outputs
    .flatMap((output) => (output.type === 'chunk' ? [output.code] : []))
    .join('\n')
  const context = createContext({})
  runInContext('delete Promise.withResolvers', context)
  runInContext(code, context)
  const values = await runInContext(
    `(async () => {
    const values = [];
    const run = TaskUtility.createLatestAsyncTask(async value => { values.push(value) });
    const first = run(1);
    run(2);
    const last = run(3);
    if (first !== last) throw new Error('Completion promise changed');
    await last;
    return values;
  })()`,
    context,
  )
  expect(Array.from(values)).toEqual([1, 3])
})

it('should leave server bundles on the supported Node runtime without browser polyfills', async () => {
  const result = await build({
    build: {
      ssr: fileURLToPath(
        new URL('../../src/utils/create-latest-async-task/index.ts', import.meta.url),
      ),
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    plugins: [createPolyfillsPlugin()],
    root: fileURLToPath(new URL('../../', import.meta.url)),
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((output) =>
    'output' in output ? output.output : [],
  )
  const code = outputs
    .flatMap((output) => (output.type === 'chunk' ? [output.code] : []))
    .join('\n')
  expect(code).toContain('Promise.withResolvers')
  expect(code).not.toContain('core-js')
})
