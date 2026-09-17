import {spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {afterAll, expect, it} from 'vitest'

const directory = mkdtempSync(join(tmpdir(), '.hooks-only-'))
const binary = resolve(import.meta.dirname, '../../../../node_modules/oxlint/bin/oxlint')
const plugin = resolve(import.meta.dirname, '../../index.mjs')
const config = join(directory, '.oxlintrc.json')
writeFileSync(
  config,
  JSON.stringify({
    categories: {correctness: 'off'},
    jsPlugins: [{name: 'project', specifier: plugin}],
    rules: {'project/hooks-only': ['error', ['hooks']]},
  }),
)
afterAll(() => rmSync(directory, {force: true, recursive: true}))

const lint = (files: Record<string, string>, target?: string) => {
  const project = mkdtempSync(join(directory, 'project-'))
  Object.entries(files).forEach(([name, code]) => {
    const file = join(project, name)
    mkdirSync(dirname(file), {recursive: true})
    writeFileSync(file, code)
  })
  const result = spawnSync(
    process.execPath,
    [binary, '--config', config, join(project, target ?? 'hooks')],
    {
      cwd: project,
      encoding: 'utf8',
    },
  )
  expect(result.error).toBeUndefined()
  return {output: result.stdout + result.stderr, status: result.status}
}

const hook = "import {createSignal} from 'solid-js'; export const state = () => createSignal(0)"
const context =
  "import {createContext as context} from 'solid-js'; export const settings = context()"
const consumer = `import {useContext as read} from 'solid-js';
  import {settings} from './context';
  export const readSettings = () => read(settings)`
const provider = `import {settings} from './context';
  export const Boundary = (props) => <settings.Provider value={1}>{props.children}</settings.Provider>`

it.each([
  ['hook without a naming convention', {'hooks/topic/anything.ts': hook}],
  [
    'namespace import',
    {
      'hooks/topic/state.ts':
        "import * as Solid from 'solid-js'; export function state() { return Solid.createSignal(0) }",
    },
  ],
  [
    'helper imported by a hook',
    {
      'hooks/topic/helper.ts': 'export const initial = () => 0',
      'hooks/topic/logic.ts': `import {createSignal} from 'solid-js';
        import {initial} from './helper';
        export const state = () => createSignal(initial())`,
    },
  ],
  [
    'transitive helper and re-export',
    {
      'hooks/topic/bridge.ts': "export {initial} from './helper'",
      'hooks/topic/helper.ts': "import {zero} from './value'; export const initial = () => zero()",
      'hooks/topic/logic.ts': `import {createSignal} from 'solid-js';
        import {initial} from './bridge';
        export const state = () => createSignal(initial())`,
      'hooks/topic/value.ts': 'export const zero = () => 0',
    },
  ],
  [
    'actual context provider and consumer',
    {
      'hooks/topic/context.ts': context,
      'hooks/topic/logic.ts': consumer,
      'hooks/topic/view.tsx': provider,
    },
  ],
  [
    'hook through local composition',
    {
      'hooks/topic/base.ts': hook,
      'hooks/topic/logic.ts':
        "import {state} from './base'; export const preference = () => state()",
    },
  ],
  [
    'type-only companion',
    {
      'hooks/topic/logic.ts': hook,
      'hooks/topic/types.ts': 'export interface Options { value: number }',
    },
  ],
  [
    'helper with a misleading hook filename',
    {
      'hooks/topic/logic.ts': `import {createSignal} from 'solid-js';
        import {initial} from './use-value';
        export const state = () => createSignal(initial())`,
      'hooks/topic/use-value.ts': 'export const initial = () => 0',
    },
  ],
])('should allow %s', (_, files) => {
  const result = lint(files as Record<string, string>)
  expect(result.output).not.toContain('project(hooks-only)')
  expect(result.status).toBe(0)
})

it.each([
  [
    'plain functions without a hook',
    {'hooks/topic/logic.ts': 'export const add = (a, b) => a + b'},
    'missingHook',
  ],
  [
    'hook-like function and filename without hook behavior',
    {'hooks/topic/use-value.ts': 'export const useValue = () => 1'},
    'missingHook',
  ],
  [
    'unused Solid import',
    {'hooks/topic/logic.ts': "import {createSignal} from 'solid-js'; export const value = () => 1"},
    'missingHook',
  ],
  [
    'module-level state without a hook',
    {
      'hooks/topic/logic.ts':
        "import {createSignal} from 'solid-js'; export const value = createSignal(0)",
    },
    'missingHook',
  ],
  [
    'unrelated helper file',
    {'hooks/topic/helper.ts': 'export const unrelated = () => 1', 'hooks/topic/logic.ts': hook},
    'unrelated',
  ],
  [
    'unrelated function in the same file',
    {'hooks/topic/logic.ts': `${hook}; export const unrelated = () => 1`},
    'unrelated',
  ],
  [
    'ordinary UI beside a hook',
    {'hooks/topic/logic.ts': hook, 'hooks/topic/view.tsx': 'export const View = () => <div />'},
    'component',
  ],
  [
    'provider name hiding ordinary UI',
    {'hooks/topic/logic.ts': hook, 'hooks/topic/view.tsx': 'export const Provider = () => <div />'},
    'component',
  ],
  [
    'fake Provider property',
    {
      'hooks/topic/logic.ts': hook,
      'hooks/topic/view.tsx':
        'const fake = {Provider: (props) => props.children}; export const View = () => <fake.Provider />',
    },
    'component',
  ],
  [
    'UI inside a real provider',
    {
      'hooks/topic/context.ts': context,
      'hooks/topic/logic.ts': consumer,
      'hooks/topic/view.tsx': provider.replace('{props.children}', '<div>{props.children}</div>'),
    },
    'component',
  ],
  [
    'provider without a consuming hook',
    {'hooks/topic/context.ts': context, 'hooks/topic/view.tsx': provider},
    'missingHook',
  ],
  ['hook directly in hooks root', {'hooks/logic.ts': hook}, 'topic'],
  [
    'hook in a different topic',
    {'hooks/one/logic.ts': hook, 'hooks/two/logic.ts': 'export const value = () => 1'},
    'missingHook',
  ],
  [
    'hook only in tests',
    {
      'hooks/topic/__tests__/logic.spec.ts': hook,
      'hooks/topic/logic.ts': 'export const value = () => 1',
    },
    'missingHook',
  ],
  [
    'shadowed Solid API',
    {
      'hooks/topic/logic.ts':
        "import {createSignal} from 'solid-js'; export const value = (createSignal) => createSignal(0)",
    },
    'missingHook',
  ],
])('should reject %s', (_, files, reason) => {
  const result = lint(files as Record<string, string>)
  expect(result.status).toBe(1)
  expect(result.output).toContain(`hooks-only`)
  expect(result.output).toContain(String(reason))
})

it('should inspect siblings even when only one helper file is linted', () => {
  const result = lint(
    {
      'hooks/topic/helper.ts': 'export const initial = () => 0',
      'hooks/topic/logic.ts': `import {createSignal} from 'solid-js';
        import {initial} from './helper';
        export const state = () => createSignal(initial())`,
    },
    'hooks/topic/helper.ts',
  )
  expect(result.status).toBe(0)
})

it('should leave files outside hooks alone', () => {
  expect(lint({'utils/value.ts': 'export const value = () => 1'}, 'utils/value.ts').status).toBe(0)
})

it('should recognize a hook composed from another topic', () => {
  expect(
    lint({
      'hooks/base/logic.ts': hook,
      'hooks/derived/logic.ts':
        "import {state as base} from '../base/logic'; export const derived = () => base()",
    }).status,
  ).toBe(0)
})

it.each(['export default () => <div />', 'export default function () { return <div /> }'])(
  'should reject anonymous default UI components: %s',
  (code) => {
    const result = lint({'hooks/topic/logic.ts': hook, 'hooks/topic/view.tsx': code})
    expect(result.status).toBe(1)
    expect(result.output).toContain('component')
  },
)

it('should recognize an anonymous default hook', () => {
  expect(
    lint({
      'hooks/topic/logic.ts':
        "import {createSignal} from 'solid-js'; export default () => createSignal(0)",
    }).status,
  ).toBe(0)
})

it('should not consider a reference to a hook a hook call', () => {
  const result = lint({
    'hooks/base/logic.ts': hook,
    'hooks/topic/logic.ts':
      "import {state} from '../base/logic'; export const reference = () => state",
  })
  expect(result.status).toBe(1)
  expect(result.output).toContain('missingHook')
})

it('should recognize a local alias of a Solid primitive', () => {
  expect(
    lint({
      'hooks/topic/logic.ts': `
    import {createSignal} from 'solid-js'
    const state = createSignal
    export const preference = () => state(0)
  `,
    }).status,
  ).toBe(0)
})

it('should reject a component that creates state and renders UI', () => {
  const result = lint({
    'hooks/topic/view.tsx': `
    import {createSignal} from 'solid-js'
    export const View = () => { const [value] = createSignal(0); return <div>{value()}</div> }
  `,
  })
  expect(result.status).toBe(1)
  expect(result.output).toContain('missingHook')
  expect(result.output).toContain('component')
})

it('should follow a provider alias through a barrel', () => {
  expect(
    lint({
      'hooks/topic/context.ts': context,
      'hooks/topic/index.ts': "export {settings as context} from './context'",
      'hooks/topic/logic.ts': consumer,
      'hooks/topic/view.tsx': `
      import {context} from './index'
      const Boundary = context.Provider
      export const Wrapper = (props) => <Boundary value={1}>{props.children}</Boundary>
    `,
    }).status,
  ).toBe(0)
})
