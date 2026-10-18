import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import typescript from '@typescript/typescript6'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createLanguageService} from '../create-language-service'
import {createProjectLanguages} from '../create-project-languages'
interface TypeScriptModule {
  readonly default: typeof typescript
}
vi.mock('@typescript/typescript6', async () => {
  const actual = await vi.importActual<TypeScriptModule>('@typescript/typescript6')
  return {
    ...actual,
    default: {...actual.default, resolveModuleName: vi.fn(actual.default.resolveModuleName)},
  }
})
afterEach(() => vi.clearAllMocks())
describe('createLanguageService resolution reuse', () => {
  it('should discard standalone path probes before a reference query discovers a new module', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'path-probe-resolution-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    const source = 'export function greet() {}'
    const file = join(root, 'core.ts')
    const caller = join(root, 'caller.ts')
    const missing = join(root, 'missing.ts')
    writeFileSync(file, source)
    writeFileSync(caller, "import {greet as hello} from './missing'; hello()")
    const service = createLanguageService(file)
    try {
      expect(service.resolveModule(caller, './missing')).toBeUndefined()
      writeFileSync(missing, "export {greet} from './core'")
      expect(
        service
          .references(file, source.indexOf('greet'), [file, caller, missing], {complete: false})
          .filter((reference) => reference.fileName === caller),
      ).toHaveLength(3)
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should resolve each import once while preparing the full semantic reference query', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'preloaded-resolution-')))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {module: 'esnext', moduleResolution: 'bundler', noLib: true, types: []},
      }),
    )
    const source =
      "import type {Missing} from 'unavailable'; export function greet(value: Missing) {}"
    const file = join(root, 'core.ts')
    const caller = join(root, 'caller.ts')
    writeFileSync(file, source)
    writeFileSync(caller, "import {greet as hello} from './core'; hello(null)")
    const service = createLanguageService(file)
    try {
      const references = (
        await Array.fromAsync(service.scanReferences(file, source.indexOf('greet'), [file, caller]))
      ).flat()
      expect(references.filter((reference) => reference.fileName === caller)).toHaveLength(3)
      expect(
        vi
          .mocked(typescript.resolveModuleName)
          .mock.calls.filter(
            ([specifier, containing]) => specifier === './core' && containing === caller,
          ),
      ).toHaveLength(1)
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should reuse successful imports while adding reference roots and still recover missing modules', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'resolution-reuse-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    const source = "import {value} from './shared'; export function greet() { return value }"
    writeFileSync(join(root, 'core.ts'), source)
    writeFileSync(join(root, 'shared.ts'), 'export const value = 1')
    writeFileSync(join(root, 'use.ts'), "import {greet as hello} from './core'; hello()")
    writeFileSync(join(root, 'pending.ts'), "import {greet as later} from './missing'; later()")
    const file = join(root, 'core.ts')
    const service = createLanguageService(file)
    const files = ['core.ts', 'shared.ts', 'use.ts', 'pending.ts'].map((path) => join(root, path))
    const sharedCalls = () =>
      vi
        .mocked(typescript.resolveModuleName)
        .mock.calls.filter(
          ([specifier, containing]) => specifier === './shared' && containing === file,
        ).length
    try {
      service.warm(file)
      expect(sharedCalls()).toBe(1)
      const result = service.references(file, source.indexOf('greet'), files, {complete: false})
      expect(
        result.filter((reference) => reference.fileName === join(root, 'use.ts')),
      ).toHaveLength(3)
      expect(sharedCalls()).toBe(1)
      writeFileSync(join(root, 'missing.ts'), "export {greet} from './core'")
      const updated = service.references(
        file,
        source.indexOf('greet'),
        [...files, join(root, 'missing.ts')],
        {complete: false},
      )
      expect(
        updated.filter((reference) => reference.fileName === join(root, 'pending.ts')),
      ).toHaveLength(3)
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should resolve a newly created TypeScript source ahead of an existing JavaScript module', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'resolution-priority-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    const source = "import {value} from './shared'; export function greet() { return value }"
    writeFileSync(join(root, 'core.ts'), source)
    writeFileSync(join(root, 'shared.js'), 'export const value = 1')
    const file = join(root, 'core.ts')
    const service = createLanguageService(file)
    try {
      expect(
        service.definitions(file, source.indexOf('value')).map((target) => target.fileName),
      ).toEqual([join(root, 'shared.js')])
      writeFileSync(join(root, 'shared.ts'), 'export const value = 2')
      service.references(
        file,
        source.indexOf('greet'),
        [file, join(root, 'shared.js'), join(root, 'shared.ts')],
        {complete: false},
      )
      expect(
        service.definitions(file, source.indexOf('value')).map((target) => target.fileName),
      ).toEqual([join(root, 'shared.ts')])
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should connect a declaration to a package source that is created after the initial query', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'resolution-generated-')))
    mkdirSync(join(root, 'core/dist'), {recursive: true})
    mkdirSync(join(root, 'core/src'))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(
      join(root, 'core/package.json'),
      '{"source":"src/index.ts","types":"dist/index.d.ts"}',
    )
    writeFileSync(join(root, 'core/dist/index.d.ts'), 'export declare function greet(): void;')
    const caller = "import {greet as hello} from './core/dist/index'; hello()"
    const file = join(root, 'use.ts')
    writeFileSync(file, caller)
    const languages = createProjectLanguages(root)
    const service = languages.get(file)
    try {
      expect(
        service.definitions(file, caller.lastIndexOf('hello')).map((target) => target.fileName),
      ).toEqual([join(root, 'core/dist/index.d.ts')])
      const source = join(root, 'core/src/index.ts')
      writeFileSync(source, 'export function greet() {}')
      expect(
        service
          .references(source, 16, [source, file], {complete: false})
          .filter((target) => target.fileName === file),
      ).toHaveLength(3)
      expect(
        service.definitions(file, caller.lastIndexOf('hello')).map((target) => target.fileName),
      ).toEqual([source])
    } finally {
      languages.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
