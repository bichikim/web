import {mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'

/** Creates same-directory ESM/CJS consumers whose conditional declarations map to different originals. */
export const createConditionalFixtures = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-conditions-')))
  const documents: string[] = []
  const write = (path: string, text: string): void => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), text)
    if (/\.[cm]?ts$/u.test(path) && !/\.d\.[cm]?ts$/u.test(path)) {
      documents.push(path)
    }
  }
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {module: 'nodenext', moduleResolution: 'nodenext', noLib: true, types: []},
    }),
  )
  write(
    'packages/core/package.json',
    JSON.stringify({
      exports: {
        '.': {import: {types: './dist/entry.d.mts'}, require: {types: './dist/entry.d.cts'}},
      },
      name: 'core',
      type: 'module',
    }),
  )
  const cases = []
  const DEFINITION_COLUMN = 17
  for (const [mode, suffix] of [
    ['esm', 'mts'],
    ['cjs', 'cts'],
  ] as const) {
    const target = `packages/core/src/${mode}.ts`
    const consumer = `apps/use.${suffix}`
    const declaration = `entry.d.${suffix}`
    const text = `import {greet as ${mode}} from 'core'; ${mode}()`
    write(target, 'export function greet() {}')
    write(
      `packages/core/dist/${declaration}`,
      `export declare function greet(): void;\n//# sourceMappingURL=${declaration}.map`,
    )
    write(
      `packages/core/dist/${declaration}.map`,
      JSON.stringify({file: declaration, mappings: '', sources: [`../src/${mode}.ts`], version: 3}),
    )
    write(consumer, text)
    const expected = [...text.matchAll(new RegExp(`greet|${mode}`, 'gu'))]
      .map((match) => JSON.stringify([consumer, 1, match.index + 1]))
      .sort()
    cases.push({
      documents,
      expected,
      kind: 'references',
      name: `conditions-${mode}`,
      needle: 'greet',
      root,
      target,
    })
    cases.push({
      documents,
      expected: [JSON.stringify([target, 1, DEFINITION_COLUMN])],
      kind: 'definition',
      name: `conditions-${mode}-definition`,
      needle: `${mode}()`,
      root,
      target: consumer,
    })
  }
  mkdirSync(join(root, 'node_modules'))
  symlinkSync(join(root, 'packages/core'), join(root, 'node_modules/core'), 'dir')
  return cases
}
