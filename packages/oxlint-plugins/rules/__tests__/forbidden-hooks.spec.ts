import {spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {afterAll, expect, it} from 'vitest'

const directory = mkdtempSync(join(tmpdir(), '.forbidden-hooks-'))
const binary = resolve(import.meta.dirname, '../../../../node_modules/oxlint/bin/oxlint')
const plugin = resolve(import.meta.dirname, '../../index.mjs')
const config = join(directory, '.oxlintrc.json')
writeFileSync(
  config,
  JSON.stringify({
    categories: {correctness: 'off'},
    jsPlugins: [{name: 'project', specifier: plugin}],
    rules: {'project/forbidden-hooks': ['error', ['utils/**/*']]},
  }),
)
afterAll(() => rmSync(directory, {force: true, recursive: true}))

const lint = (code: string, filename = 'apps/demo/src/utils/example.ts') => {
  const target = join(directory, filename)
  mkdirSync(dirname(target), {recursive: true})
  writeFileSync(target, code)
  const result = spawnSync(process.execPath, [binary, '--config', config, target], {
    cwd: directory,
    encoding: 'utf8',
  })
  expect(result.error).toBeUndefined()
  return {output: result.stdout + result.stderr, status: result.status}
}

it.each([
  "import {createSignal as state} from 'solid-js'; export const value = state(0)",
  "import * as Solid from 'solid-js'; export const value = Solid.createSignal(0)",
  "import {createStore} from 'solid-js/store'; export const value = createStore({})",
  "import {usePreference as preference} from '../preferences'; export const value = preference()",
  "import preference from '../hooks/preference'; export const value = preference()",
  "export {createEffect as effect} from 'solid-js'",
  "export * from '../hooks'",
  'export function usePreference() { return 1 }',
  'export const usePreference = () => 1',
  'export const result = controller.usePreference()',
  "export const result = import('solid-js')",
  "export const result = require('../hooks/preference')",
])('should reject hook code in a nested utils directory: %s', (code) => {
  const result = lint(code)
  expect(result.status).toBe(1)
  expect(result.output).toContain('forbidden-hooks')
})

it.each([
  'export const add = (left: number, right: number) => left + right',
  "import type {Accessor} from 'solid-js'; export type Value = Accessor<number>",
  "import {type Accessor} from 'solid-js'; export type Value = Accessor<number>",
  "export type {Accessor} from 'solid-js'",
  "export {type Accessor} from 'solid-js'",
  'export const username = () => 1',
])('should allow non-hook code and type-only imports: %s', (code) => {
  const result = lint(code)
  expect(result.status).toBe(0)
  expect(result.output).not.toContain('forbidden-hooks')
})

it('should allow hooks outside the configured directories', () => {
  const result = lint(
    "import {createSignal} from 'solid-js'; export const useValue = () => createSignal(0)",
    'apps/demo/src/hooks/use-value.ts',
  )
  expect(result.status).toBe(0)
})

it('should reject hooks directly inside a root utils directory', () => {
  expect(lint('export const useValue = () => 1', 'utils/value.ts').status).toBe(1)
})

it('should allow a hook-like filename containing only a pure function', () => {
  expect(
    lint('export const identity = (value: string) => value', 'utils/use-value.ts').status,
  ).toBe(0)
})
