import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, relative} from 'node:path'
import typescript from '@typescript/typescript6'
import {describe, expect, it} from 'vitest'
import {createProjectLanguages} from '../create-project-languages'

const createFixture = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-projects-')))
  const write = (path: string, source: string): void => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), source)
  }
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {module: 'esnext', moduleResolution: 'bundler', noLib: true, types: []},
    }),
  )
  const languages = createProjectLanguages(root)
  return {
    dispose: () => {
      languages.dispose()
      rmSync(root, {force: true, recursive: true})
    },
    languages,
    root,
    write,
  }
}
const positions = (root: string, references: readonly typescript.ReferenceEntry[]): string[] =>
  references
    .map(({fileName, textSpan}) =>
      JSON.stringify([relative(root, fileName), textSpan.start, textSpan.length]),
    )
    .sort()
const occurrences = (root: string, path: string, word: string): string[] =>
  [...readFileSync(join(root, path), 'utf8').matchAll(new RegExp(`\\b${word}\\b`, 'g'))].map(
    (match) => JSON.stringify([path, match.index, word.length]),
  )

describe('project module navigation', () => {
  it('should resolve inherited consumer aliases and distinguish the same alias in another project', async () => {
    const fixture = createFixture()
    const {root, write, languages} = fixture
    write('core/entry.ts', 'export function greet() {}')
    write('bridge/index.ts', "export {greet as welcome} from '../core/entry'")
    write(
      'apps/tsconfig.json',
      JSON.stringify({
        compilerOptions: {paths: {'@public': ['../bridge/index.ts']}},
        extends: '../tsconfig.json',
      }),
    )
    write('apps/caller/use.ts', "import {welcome as hello} from '@public'; hello()")
    write(
      'other/tsconfig.json',
      JSON.stringify({
        compilerOptions: {paths: {'@public': ['./entry.ts']}},
        extends: '../tsconfig.json',
      }),
    )
    write('other/entry.ts', 'export function welcome() {}')
    write('other/use.ts', "import {welcome as hello} from '@public'; hello()")
    const file = join(root, 'core/entry.ts')
    const service = languages.get(file)
    const files = [
      'core/entry.ts',
      'bridge/index.ts',
      'apps/caller/use.ts',
      'other/entry.ts',
      'other/use.ts',
    ].map((path) => join(root, path))
    const expected = [
      ...occurrences(root, 'bridge/index.ts', 'greet'),
      ...occurrences(root, 'bridge/index.ts', 'welcome'),
      ...occurrences(root, 'apps/caller/use.ts', 'welcome'),
      ...occurrences(root, 'apps/caller/use.ts', 'hello'),
    ].sort()
    try {
      expect(positions(root, service.references(file, 16, files))).toEqual(expected)
      const batches = await Array.fromAsync(service.scanReferences(file, 16, files))
      expect([...new Set(batches.flatMap((batch) => positions(root, batch)))].sort()).toEqual(
        expected,
      )
      expect(
        service
          .definitions(join(root, 'apps/caller/use.ts'), 43)
          ?.map((definition) => definition.fileName),
      ).toEqual([file])
    } finally {
      fixture.dispose()
    }
  })
  it('should join declaration-map imports with original source aliases and definitions', async () => {
    const fixture = createFixture()
    const {root, write, languages} = fixture
    write('core/entry.ts', 'export function greet() {}')
    typescript
      .createProgram([join(root, 'core/entry.ts')], {
        declaration: true,
        declarationMap: true,
        emitDeclarationOnly: true,
        noLib: true,
        outDir: join(root, 'core/dist'),
        rootDir: join(root, 'core'),
        types: [],
      })
      .emit()
    write(
      'apps/tsconfig.json',
      JSON.stringify({
        compilerOptions: {paths: {'@built': ['../core/dist/entry.d.ts']}},
        extends: '../tsconfig.json',
      }),
    )
    write('apps/use.ts', "import {greet as hello} from '@built'; hello()")
    write('direct.ts', "import {greet as direct} from './core/entry'; direct()")
    const file = join(root, 'core/entry.ts')
    const service = languages.get(file)
    const files = ['core/entry.ts', 'core/dist/entry.d.ts', 'apps/use.ts', 'direct.ts'].map(
      (path) => join(root, path),
    )
    const expected = [
      ...occurrences(root, 'apps/use.ts', 'greet'),
      ...occurrences(root, 'apps/use.ts', 'hello'),
      ...occurrences(root, 'direct.ts', 'greet'),
      ...occurrences(root, 'direct.ts', 'direct'),
    ].sort()
    try {
      expect(positions(root, service.references(file, 16, files))).toEqual(expected)
      const batches = await Array.fromAsync(service.scanReferences(file, 16, files))
      expect([...new Set(batches.flatMap((batch) => positions(root, batch)))].sort()).toEqual(
        expected,
      )
      expect(
        service
          .definitions(join(root, 'apps/use.ts'), 39)
          ?.map((definition) => definition.fileName),
      ).toEqual([file])
    } finally {
      fixture.dispose()
    }
  })
  it('should join workspace package source metadata and subpath declarations without a declaration map', () => {
    const fixture = createFixture()
    const {root, write, languages} = fixture
    write(
      'core/package.json',
      JSON.stringify({
        exports: {'.': {types: './dist/index.d.ts'}, './entry': {types: './dist/entry.d.ts'}},
        name: 'core',
        source: 'src/index.ts',
        types: 'dist/index.d.ts',
      }),
    )
    write('core/src/index.ts', "export {greet} from './entry'")
    write('core/src/entry.ts', 'export function greet() {}')
    write('core/dist/index.d.ts', "export {greet} from './entry'")
    write('core/dist/entry.d.ts', 'export declare function greet(): void;')
    write('apps/barrel.ts', "import {greet as hello} from 'core'; hello()")
    write('apps/subpath.ts', "import {greet as hello} from 'core/entry'; hello()")
    mkdirSync(join(root, 'node_modules'))
    symlinkSync(join(root, 'core'), join(root, 'node_modules/core'), 'dir')
    const file = join(root, 'core/src/entry.ts')
    const files = [
      'core/src/entry.ts',
      'core/src/index.ts',
      'core/dist/index.d.ts',
      'core/dist/entry.d.ts',
      'apps/barrel.ts',
      'apps/subpath.ts',
    ].map((path) => join(root, path))
    const service = languages.get(file)
    try {
      const result = positions(root, service.references(file, 16, files))
      expect(result).toEqual(
        [
          ...occurrences(root, 'core/src/index.ts', 'greet'),
          ...occurrences(root, 'core/dist/index.d.ts', 'greet'),
          ...occurrences(root, 'apps/barrel.ts', 'greet'),
          ...occurrences(root, 'apps/barrel.ts', 'hello'),
          ...occurrences(root, 'apps/subpath.ts', 'greet'),
          ...occurrences(root, 'apps/subpath.ts', 'hello'),
        ].sort(),
      )
      expect(
        service
          .definitions(join(root, 'apps/barrel.ts'), 37)
          ?.map((definition) => definition.fileName),
      ).toEqual([file])
    } finally {
      fixture.dispose()
    }
  })
  it('should invalidate retained module resolutions when a declaration map changes', () => {
    const fixture = createFixture()
    const {root, write, languages} = fixture
    write('core/one.ts', 'export function greet() {}')
    write('core/two.ts', 'export function greet() {}')
    write(
      'core/dist/entry.d.ts',
      'export declare function greet(): void;\n//# sourceMappingURL=entry.d.ts.map',
    )
    const map = (source: string): string =>
      JSON.stringify({file: 'entry.d.ts', mappings: '', sources: [source], version: 3})
    write('core/dist/entry.d.ts.map', map('../one.ts'))
    const caller = "import {greet as hello} from './core/dist/entry'; hello()"
    write('use.ts', caller)
    const service = languages.get('use.ts')
    const file = join(root, 'use.ts')
    try {
      expect(
        service
          .definitions(file, caller.lastIndexOf('hello'))
          .map((definition) => definition.fileName),
      ).toEqual([join(root, 'core/one.ts')])
      write('core/dist/entry.d.ts.map', map('../two.ts'))
      expect(
        service
          .definitions(file, caller.lastIndexOf('hello'))
          .map((definition) => definition.fileName),
      ).toEqual([join(root, 'core/two.ts')])
    } finally {
      fixture.dispose()
    }
  })
})
