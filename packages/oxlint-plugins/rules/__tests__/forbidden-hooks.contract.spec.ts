import {RuleTester} from 'oxlint/plugins-dev'
import {describe, it} from 'vitest'
// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import {forbiddenHooks} from '../forbidden-hooks.mjs'
RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({languageOptions: {parserOptions: {lang: 'ts'}}})
const filename = '/project/.worktree/apps/demo/src/utils/topic/logic.ts'
const options = [['utils/**/*']]
tester.run('forbidden-hooks', forbiddenHooks, {
  invalid: [
    {
      code: "import {createSignal} from 'solid-js';",
      errors: [{column: 0, endColumn: 38, line: 1, messageId: 'forbidden'}],
      filename,
      name: 'should report the runtime import with the declared message',
      options,
    },
    {
      code: 'function useValue() { return 1 }',
      errors: [{column: 9, endColumn: 17, line: 1, messageId: 'forbidden'}],
      filename,
      name: 'should report named hook declarations',
      options,
    },
  ],
  valid: [
    {
      code: "import {value} from '../use-value'; export const result = value()",
      filename,
      name: 'should allow an ordinary import regardless of its filename',
      options,
    },
    {
      code: "import type {Accessor} from 'solid-js'; export type Value = Accessor<number>",
      filename,
      name: 'should allow type-only imports',
      options,
    },
    {
      code: "import {createSignal} from 'solid-js'",
      filename: '/project/hooks/topic.ts',
      name: 'should skip files outside the configured paths',
      options,
    },
    {
      code: "import {createSignal} from 'solid-js'",
      filename,
      name: 'should remain inactive without options',
    },
  ],
})
