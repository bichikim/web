import {mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'

const createFixtureFiles = (root: string) => {
  const documents: string[] = []
  const expected: string[] = []
  const write = (path: string, source: string, words: readonly string[] = []): void => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), source)
    if (/\.[cm]?[jt]sx?$/u.test(path) && !path.endsWith('.d.ts')) {
      documents.push(path)
    }
    for (const match of source.matchAll(/[A-Za-z_$][\w$]*/gu)) {
      if (words.includes(match[0])) {
        const lines = source.slice(0, match.index).split('\n')
        expected.push(JSON.stringify([path, lines.length, (lines.at(-1)?.length ?? 0) + 1]))
      }
    }
  }
  return {documents, expected, write}
}

const writeCallFixtures = (write: ReturnType<typeof createFixtureFiles>['write']): void => {
  write(
    'apps/comment.cjs',
    "const {greet: commented} = require /* note */ ('../packages/core/src/entry'); commented()",
    ['greet', 'commented'],
  )
  write(
    'apps/line.cjs',
    "const {greet: continued} = require // note\n ('../packages/core/src/entry'); continued()",
    ['greet', 'continued'],
  )
  write(
    'apps/template.cjs',
    // oxlint-disable-next-line no-template-curly-in-string -- This fixture preserves literal TypeScript template syntax.
    "const text = `hello ${1}`; const {greet: templated} = require('../packages/core/src/entry'); templated()",
    ['greet', 'templated'],
  )
}

/** Creates independently enumerated module-binding and declaration-owner regression cases. */
export const createLinkingFixtures = () => {
  const SOURCE_FUNCTION_COLUMN = 17
  const SOURCE_MEMBER_COLUMN = 18
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-linking-')))
  const {documents, expected, write} = createFixtureFiles(root)
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        target: 'esnext',
        types: [],
      },
    }),
  )
  write('packages/core/src/entry.ts', 'export function greet() {}\nexport function other() {}')
  write('packages/core/src/index.ts', "export {greet as welcome} from './entry'", [
    'greet',
    'welcome',
  ])
  write('packages/core/dist/index.d.ts', "export {greet as welcome} from './entry'")
  write(
    'packages/core/dist/entry.d.ts',
    'export declare function greet(): void;\nexport declare function other(): void;',
  )
  write(
    'packages/core/package.json',
    JSON.stringify({
      exports: {'.': {types: './dist/index.d.ts'}},
      name: 'core',
      source: './src/index.ts',
      types: './dist/index.d.ts',
    }),
  )
  mkdirSync(join(root, 'node_modules'))
  symlinkSync(join(root, 'packages/core'), join(root, 'node_modules/core'), 'dir')
  writeCallFixtures(write)
  write('other/entry.ts', 'export function greet() {}')
  write('apps/require.cjs', "const {welcome: hello} = require('core'); hello()", [
    'welcome',
    'hello',
  ])
  write(
    'apps/quoted.cjs',
    "const {'greet': quoted} = require('../packages/core/src/entry'); quoted()",
    ['quoted'],
  )
  expected.push(JSON.stringify(['apps/quoted.cjs', 1, 'const {'.length + 1]))
  write('apps/shorthand.cjs', "const {greet} = require('../packages/core/src/entry'); greet()", [
    'greet',
  ])
  write(
    'loose/async.mjs',
    "async function start() { const {greet: later} = await import('../packages/core/src/entry'); later() }",
    ['greet', 'later'],
  )
  write(
    'apps/unrelated.cjs',
    "const {greet: hello} = require('../other/entry'); hello(); function shadow(hello) { hello() }",
  )
  write(
    'apps/shadow.cjs',
    "function run(require) { const {greet: hello} = require('../packages/core/src/entry'); hello() }",
  )
  write(
    'apps/mutable.cjs',
    "let {greet: hello} = require('../packages/core/src/entry'); hello = () => {}; hello()",
  )
  expected.push(JSON.stringify(['apps/mutable.cjs', 1, 'let {'.length + 1]))
  write(
    'apps/parameter.cjs',
    "const {greet: alias} = require('../packages/core/src/entry'); alias();\nfunction shadow(alias) { alias() }",
    [],
  )
  const parameter = "const {greet: alias} = require('../packages/core/src/entry'); alias();"
  for (const match of parameter.matchAll(/greet|alias/gu)) {
    expected.push(JSON.stringify(['apps/parameter.cjs', 1, match.index + 1]))
  }
  const base = {documents, root}
  const bindings = {
    ...base,
    expected: expected.sort(),
    kind: 'references' as const,
    name: 'linked-bindings',
    needle: 'greet',
    target: 'packages/core/src/entry.ts',
  }
  write('packages/core/src/classes.ts', 'export class A { run() {} }\nexport class B { run() {} }')
  write(
    'packages/core/dist/classes.d.ts',
    [
      'export declare class A { run(): void; }',
      'export declare class B { run(): void; }',
      '//# sourceMappingURL=classes.d.ts.map',
    ].join('\n'),
  )
  write(
    'packages/core/dist/classes.d.ts.map',
    JSON.stringify({
      file: 'classes.d.ts',
      mappings: '',
      sources: ['../src/classes.ts'],
      version: 3,
    }),
  )
  write(
    'apps/classes.ts',
    "import {A, B} from '../packages/core/dist/classes'; new A().run(); new B().run()",
  )
  const caller = "import {A, B} from '../packages/core/dist/classes'; new A().run(); new B().run()"
  return [
    bindings,
    {
      ...base,
      expected: [JSON.stringify(['packages/core/src/entry.ts', 1, SOURCE_FUNCTION_COLUMN])],
      kind: 'definition' as const,
      name: 'linked-binding-definition',
      needle: 'hello()',
      target: 'apps/require.cjs',
    },
    {
      ...base,
      expected: [JSON.stringify(['apps/classes.ts', 1, caller.indexOf('run()') + 1])],
      kind: 'references' as const,
      name: 'linked-member',
      needle: 'run()',
      target: 'packages/core/src/classes.ts',
    },
    {
      ...base,
      expected: [JSON.stringify(['packages/core/src/classes.ts', 1, SOURCE_MEMBER_COLUMN])],
      kind: 'definition' as const,
      name: 'linked-member-definition',
      needle: 'run()',
      target: 'apps/classes.ts',
    },
  ]
}
