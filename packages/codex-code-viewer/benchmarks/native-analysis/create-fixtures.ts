import {createPreparationFixtures} from './create-preparation-fixtures'
import {mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import typescript from '@typescript/typescript6'
import {isBrowsablePath} from '../../src/server/is-browsable-path'
import {createConditionalFixtures} from './create-conditional-fixtures'
import {createLinkingFixtures} from './create-linking-fixtures'

interface FixtureCase {
  readonly name: string
  readonly root: string
  readonly target: string
  readonly needle: string
  readonly kind: 'definition' | 'references'
  readonly documents: readonly string[]
  readonly expected: readonly string[]
}
const cases: FixtureCase[] = []
const DEFINITION_COLUMN = 17
const BINDING_COLUMN = 15
const CALL_COLUMN = 59
const variants = [
  'aliases',
  'paths',
  'excluded',
  'maps',
  'maps-references',
  'package-source',
  'commonjs',
] as const
for (const variant of variants) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `native-analysis-${variant}-`)))
  const documents: string[] = []
  const expected: string[] = []
  const write = (path: string, source: string, words: readonly string[] = []): void => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), source)
    if (/\.[cm]?[jt]sx?$/u.test(path) && !path.endsWith('.d.ts')) {
      documents.push(path)
    }
    for (const match of source.matchAll(/[A-Za-z_$][\w$]*/gu)) {
      if (isBrowsablePath(path) && words.includes(match[0])) {
        const lines = source.slice(0, match.index).split('\n')
        expected.push(JSON.stringify([path, lines.length, (lines.at(-1)?.length ?? 0) + 1]))
      }
    }
  }
  const configuration = {module: 'esnext', moduleResolution: 'bundler', noLib: true, types: []}
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: configuration,
      ...(variant === 'excluded' ? {include: ['packages/core/**/*.ts']} : {}),
    }),
  )
  write('packages/core/entry.ts', 'export function greet() {}')
  write(
    'packages/core/tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        composite: true,
        ...(variant === 'maps' || variant === 'maps-references'
          ? {declaration: true, declarationMap: true, outDir: './dist', rootDir: '.'}
          : {}),
      },
      exclude: ['dist'],
      extends: '../../tsconfig.json',
      include: ['*.ts'],
    }),
  )
  write('unrelated.ts', 'export function greet() {}\ngreet()')
  write('shadow.ts', 'export function unrelated(greet: () => void) { greet() }')
  if (variant === 'package-source') {
    write(
      'packages/core/package.json',
      JSON.stringify({
        exports: {'.': {types: './dist/index.d.ts'}, './entry': {types: './dist/entry.d.ts'}},
        name: 'core',
        source: 'index.ts',
        types: 'dist/index.d.ts',
      }),
    )
    write('packages/core/index.ts', "export {greet} from './entry'", ['greet'])
    write('packages/core/dist/index.d.ts', "export {greet} from './entry'", ['greet'])
    write('packages/core/dist/entry.d.ts', 'export declare function greet(): void;')
    write('apps/barrel.ts', "import {greet as hello} from 'core'; hello()", ['greet', 'hello'])
    write('apps/subpath.ts', "import {greet as hello} from 'core/entry'; hello()", [
      'greet',
      'hello',
    ])
    mkdirSync(join(root, 'node_modules'))
    symlinkSync(join(root, 'packages/core'), join(root, 'node_modules/core'), 'dir')
    cases.push({
      documents,
      expected: expected.sort(),
      kind: 'references',
      name: variant,
      needle: 'greet',
      root,
      target: 'packages/core/entry.ts',
    })
    cases.push({
      documents,
      expected: [JSON.stringify(['packages/core/entry.ts', 1, DEFINITION_COLUMN])],
      kind: 'definition',
      name: `${variant}-definition`,
      needle: 'hello()',
      root,
      target: 'apps/barrel.ts',
    })
  } else if (variant === 'commonjs') {
    write(
      'tsconfig.json',
      JSON.stringify({compilerOptions: {...configuration, allowJs: true, checkJs: true}}),
    )
    write(
      'apps/caller.cjs',
      "const {greet: hello} = require('../packages/core/entry'); hello(); function unrelated(hello) { hello() }",
      ['greet'],
    )
    // Only the immutable module binding and its call refer to greet; the parameter shadows the name.
    expected.push(
      JSON.stringify(['apps/caller.cjs', 1, BINDING_COLUMN]),
      JSON.stringify(['apps/caller.cjs', 1, CALL_COLUMN]),
    )
    cases.push({
      documents,
      expected: expected.sort(),
      kind: 'references',
      name: variant,
      needle: 'greet',
      root,
      target: 'packages/core/entry.ts',
    })
  } else {
    write('packages/core/local.ts', "import {greet as local} from './entry'; local()", [
      'greet',
      'local',
    ])
    write(
      'packages/bridge/tsconfig.json',
      JSON.stringify({extends: '../../tsconfig.json', include: ['*.ts']}),
    )
    write('packages/bridge/entry.ts', "export {greet as welcome} from '../core/entry'", [
      'greet',
      'welcome',
    ])
    write('packages/bridge/next.ts', "export {welcome as invoke} from './entry'", [
      'welcome',
      'invoke',
    ])
    write(
      'apps/consumer/tsconfig.json',
      JSON.stringify({
        compilerOptions:
          variant === 'paths' ? {paths: {'@public': ['../../packages/bridge/next.ts']}} : {},
        extends: '../../tsconfig.json',
        include: ['*.ts'],
      }),
    )
    const module = variant === 'paths' ? '@public' : '../../packages/bridge/next'
    write('apps/consumer/use.ts', `import {invoke as hello} from '${module}'; hello()`, [
      'invoke',
      'hello',
    ])
    write(
      'apps/consumer/namespace.ts',
      "import * as api from '../../packages/bridge/entry'; api.welcome()",
      ['welcome'],
    )
    write('loose/use.ts', "import {greet as outside} from '../packages/core/entry'; outside()", [
      'greet',
      'outside',
    ])
    write(
      'other/tsconfig.json',
      JSON.stringify({
        compilerOptions: {paths: {'@public': ['./entry.ts']}},
        extends: '../tsconfig.json',
        include: ['*.ts'],
      }),
    )
    write('other/entry.ts', 'export function invoke() {}')
    write('other/use.ts', "import {invoke as hello} from '@public'; hello()")
    if (variant === 'maps' || variant === 'maps-references') {
      typescript
        .createProgram([join(root, 'packages/core/entry.ts')], {
          declaration: true,
          declarationMap: true,
          emitDeclarationOnly: true,
          noLib: true,
          outDir: join(root, 'packages/core/dist'),
          rootDir: join(root, 'packages/core'),
          types: [],
        })
        .emit()
      write(
        'apps/built/tsconfig.json',
        JSON.stringify({
          compilerOptions: {paths: {'@compiled': ['../../packages/core/dist/entry.d.ts']}},
          extends: '../../tsconfig.json',
          ...(variant === 'maps-references' ? {references: [{path: '../../packages/core'}]} : {}),
          include: ['*.ts'],
        }),
      )
      write('apps/built/use.ts', "import {greet as built} from '@compiled'; built()", [
        'greet',
        'built',
      ])
    }
    cases.push({
      documents,
      expected: expected.sort(),
      kind: 'references',
      name: variant,
      needle: 'greet',
      root,
      target: 'packages/core/entry.ts',
    })
    cases.push({
      documents,
      expected: [JSON.stringify(['packages/core/entry.ts', 1, DEFINITION_COLUMN])],
      kind: 'definition',
      name: `${variant}-definition`,
      needle: variant.startsWith('maps') ? 'built()' : 'hello()',
      root,
      target: variant.startsWith('maps') ? 'apps/built/use.ts' : 'apps/consumer/use.ts',
    })
  }
}
console.log(
  JSON.stringify(
    [
      ...cases,
      ...createLinkingFixtures(),
      ...createConditionalFixtures(),
      ...createPreparationFixtures(),
    ],
    null,
    2,
  ),
)
