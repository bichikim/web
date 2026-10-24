/** @vitest-environment node */
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {RuleTester} from 'oxlint/plugins-dev'
import {afterAll, describe, expect, it} from 'vitest'
// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import {noUselessIndex} from '../no-useless-index.mjs'

RuleTester.describe = describe
RuleTester.it = it
const root = mkdtempSync(join(tmpdir(), 'index-import-'))
afterAll(() => rmSync(root, {force: true, recursive: true}))

function write(relative: string, content = 'export const value = 1') {
  const filename = join(root, relative)
  mkdirSync(join(filename, '..'), {recursive: true})
  writeFileSync(filename, content)
  return filename
}

write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      noEmit: true,
    },
  }),
)
const filename = write('src/consumer.ts')
write('src/topic/index.ts')
write('src/collision/index.ts')
write('src/collision.ts')
write('src/mixed/index.ts')
write('src/mixed/index.js')
write('src/sibling/index.ts')
write('src/sibling.mjs')
write('src/typed/index.ts')
write('src/typed/runtime.js')
write('src/typed/package.json', JSON.stringify({main: './runtime.js', types: './index.ts'}))
write('src/redirect/index.ts')
write('src/redirect/main.ts')
write('src/redirect/package.json', JSON.stringify({main: './main.ts'}))
write('src/index.ts')
write('src/component/index.tsx')
write('src/javascript/index.js')
write(
  'node/tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
  }),
)
write('node/topic/index.ts')
write('inherited/tsconfig.json', JSON.stringify({extends: '../tsconfig.json'}))
write('inherited/topic/index.ts')
const unconfigured = mkdtempSync(join(tmpdir(), 'index-unconfigured-'))
afterAll(() => rmSync(unconfigured, {force: true, recursive: true}))

const tester = new RuleTester({languageOptions: {parserOptions: {lang: 'ts'}}})
tester.run('no-useless-index', noUselessIndex, {
  invalid: [
    ...[
      "import {value} from './topic/index.ts'",
      "import './topic/index'",
      "import type {Value} from './topic/index.ts'",
      "export {value} from './topic/index.ts'",
      "export * from './topic/index.ts'",
      "export type {Value} from './topic/index.ts'",
      "const loaded = import('./topic/index.ts')",
      "import './component/index.tsx'",
      "import './javascript/index.js'",
      "import './index.ts'",
    ].map((code) => ({
      code,
      errors: [{messageId: 'redundant'}],
      filename,
      name: `should warn without fixing ${code}`,
      output: null,
    })),
    {
      code: "import '../topic/index.ts'",
      errors: [{data: {specifier: '../topic'}, messageId: 'redundant'}],
      filename: join(root, 'src/nested/consumer.ts'),
      name: 'should handle parent-relative imports',
      output: null,
    },
    {
      code: "import './topic/index.ts'",
      errors: [{messageId: 'redundant'}],
      filename: join(root, 'inherited/consumer.ts'),
      name: 'should respect inherited bundler settings',
      output: null,
    },
  ],
  valid: [
    ...[
      "import './topic'",
      "import './collision/index.ts'",
      "import './redirect/index.ts'",
      "import './mixed/index.ts'",
      "import './sibling/index.ts'",
      "import './typed/index.ts'",
      "import './missing/index.ts'",
      "import './topic/index.ts?raw'",
      "import './topic/index.ts#fragment'",
      "import './topic/index.json'",
      "import 'src/topic/index.ts'",
      "import '@scope/topic/index.ts'",
      'const loaded = import(`./topic/index.ts`)',
      'const loaded = import(path)',
      "const loaded = require('./topic/index.ts')",
    ].map((code) => ({code, filename, name: `should preserve ${code}`})),
    {
      code: "import './topic/index.ts'",
      filename: join(root, 'node/consumer.ts'),
      name: 'should preserve native Node ESM directory imports',
    },
    {
      code: "import './topic/index.ts'",
      filename: join(root, 'src/consumer.mts'),
      name: 'should preserve explicit ESM files even under bundler settings',
    },
    {
      code: "import './topic/index.ts'",
      filename: join(unconfigured, 'consumer.ts'),
      name: 'should require an explicit bundler resolution contract',
    },
  ],
})

it('should expose no automatic fix or suggestion', () => {
  expect(noUselessIndex.meta.fixable).toBeUndefined()
  expect(noUselessIndex.meta.hasSuggestions).toBeUndefined()
})
