import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {RuleTester} from 'oxlint/plugins-dev'
import {afterAll, describe, it} from 'vitest'
// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import {hooksOnly} from '../hooks-only.mjs'
RuleTester.describe = describe
RuleTester.it = it
const directory = mkdtempSync(join(tmpdir(), '.hooks-contract-'))
const topic = join(directory, 'hooks/topic')
mkdirSync(topic, {recursive: true})
afterAll(() => rmSync(directory, {force: true, recursive: true}))
const filename = join(topic, 'logic.ts')
const options = [['hooks']]
// The lint buffer must take precedence over the saved file.
writeFileSync(filename, 'export const stale = () => 1')
const tester = new RuleTester({languageOptions: {parserOptions: {lang: 'tsx'}}})
tester.run('hooks-only', hooksOnly, {
  invalid: [
    {
      code: 'export const value = () => 1',
      errors: [
        {column: 0, line: 1, messageId: 'missingHook'},
        {column: 13, endColumn: 14, line: 1, messageId: 'unrelated'},
      ],
      filename,
      name: 'should report a missing hook and an unrelated declaration',
      options,
    },
    {
      code: "import {createSignal} from 'solid-js'; export const state = () => createSignal(0)",
      errors: [{column: 0, line: 1, messageId: 'topic'}],
      filename: join(directory, 'hooks/logic.ts'),
      name: 'should reject a hook directly in the root directory',
      options,
    },
  ],
  valid: [
    {
      code: "import {createSignal} from 'solid-js'; export const state = () => createSignal(0)",
      filename,
      name: 'should analyze current source instead of the saved file',
      options,
    },
    {
      code: 'export const value = () => 1',
      filename: join(directory, 'utils/logic.ts'),
      name: 'should skip unrelated directories',
      options,
    },
  ],
})
