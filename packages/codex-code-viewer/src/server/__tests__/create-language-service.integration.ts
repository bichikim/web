import {mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createLanguageService} from '../create-language-service'

describe('createLanguageService', () => {
  it('should preserve aliases, re-exports, external package callers and changed import membership', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-scope-')))
    const sources = {
      'app/caller.ts': "import {welcome as hello} from '@core'\nhello()",
      'app/namespace.ts': "import * as core from '../core/barrel'\ncore.welcome()",
      'core/barrel.ts': "export {greet as welcome} from './entry'",
      'core/entry.ts': 'export const greet = () => 1',
      'unrelated.ts': 'export const greet = 2',
    }
    mkdirSync(join(root, 'core'))
    mkdirSync(join(root, 'app'))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {noLib: true, paths: {'@core': ['./core/barrel.ts']}, types: []},
      }),
    )
    Object.entries(sources).forEach(([path, text]) => writeFileSync(join(root, path), text))
    const file = join(root, 'core/entry.ts')
    const service = createLanguageService(file)
    const files = Object.keys(sources).map((path) => join(root, path))
    const locations = () =>
      service.references(file, 13, files).map((reference) => reference.fileName)
    try {
      expect(locations()).toEqual(
        expect.arrayContaining([
          join(root, 'app/caller.ts'),
          join(root, 'app/namespace.ts'),
          join(root, 'core/barrel.ts'),
        ]),
      )
      expect(locations()).not.toContain(join(root, 'unrelated.ts'))
      writeFileSync(
        join(root, 'unrelated.ts'),
        "import {greet as later} from './core/entry'\nlater()",
      )
      expect(locations()).toContain(join(root, 'unrelated.ts'))
      writeFileSync(join(root, 'app/caller.ts'), 'export const removed = 1')
      expect(locations()).not.toContain(join(root, 'app/caller.ts'))
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should find globals and CommonJS aliases and retain changed drafts', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-globals-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    const files = ['global.ts', 'caller.ts', 'core.js', 'require.js'].map((path) =>
      join(root, path),
    )
    const texts = [
      'function greet() {}',
      'greet()',
      'exports.run = () => 1',
      "const {run: execute} = require('./core'); execute()",
    ]
    files.forEach((file, index) => writeFileSync(file, texts[index]))
    const service = createLanguageService(files[0])
    try {
      expect(
        service.references(files[0], 9, files).map((reference) => reference.fileName),
      ).toContain(files[1])
      expect(
        service
          .references(files[2], texts[2].indexOf('run'), files)
          .map((reference) => reference.fileName),
      ).toContain(files[3])
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
    const draft = createLanguageService(
      files[0],
      new Map([
        [files[0], 'function greet() {}'],
        [files[1], 'greet(); greet()'],
      ]),
    )
    try {
      expect(draft.references(files[0], 9, files)).toHaveLength(2)
    } finally {
      draft.dispose()
    }
  })
  it('should retain workspace package exports, default aliases and namespace usages through symlinks', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-package-')))
    mkdirSync(join(root, 'core'))
    mkdirSync(join(root, 'app'))
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          types: [],
        },
      }),
    )
    writeFileSync(join(root, 'core/package.json'), '{"name":"core","exports":"./entry.ts"}')
    writeFileSync(join(root, 'app/package.json'), '{"name":"app"}')
    const sources = {
      'app/default.ts': "import hello from 'core'; hello()",
      'app/namespace.ts': "import * as core from 'core'; core.default()",
      'core/entry.ts': 'export default function greet() {}',
    }
    Object.entries(sources).forEach(([path, source]) => writeFileSync(join(root, path), source))
    symlinkSync(join(root, 'core'), join(root, 'node_modules/core'), 'dir')
    const file = join(root, 'core/entry.ts')
    const service = createLanguageService(file)
    try {
      const result = service.references(
        file,
        sources['core/entry.ts'].indexOf('greet'),
        Object.keys(sources).map((path) => join(root, path)),
      )
      expect(result.map((reference) => reference.fileName)).toEqual(
        expect.arrayContaining([join(root, 'app/default.ts'), join(root, 'app/namespace.ts')]),
      )
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain global member usages in disconnected modules', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-ambient-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    const sources = {
      'core.ts': 'export interface Thing { run(): void }',
      'globals.ts': "import {Thing} from './core'; declare global { var thing: Thing }",
      'usage.ts': 'export {}; thing.run()',
    }
    Object.entries(sources).forEach(([path, source]) => writeFileSync(join(root, path), source))
    const service = createLanguageService(join(root, 'core.ts'))
    try {
      expect(
        service
          .references(
            join(root, 'core.ts'),
            sources['core.ts'].indexOf('run'),
            Object.keys(sources).map((path) => join(root, path)),
          )
          .map((reference) => reference.fileName),
      ).toContain(join(root, 'usage.ts'))
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should recover from semantic cancellation without stale or missing results', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-cancel-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'core.ts'), 'export const greet = () => 1')
    writeFileSync(join(root, 'usage.ts'), "import {greet as hello} from './core'; hello()")
    const file = join(root, 'core.ts')
    const files = [file, join(root, 'usage.ts')]
    const service = createLanguageService(file)
    try {
      const expected = service.references(file, 13, files)
      expect(() => service.warm(file, () => true)).toThrow()
      service.warm(file)
      expect(() =>
        service.references(file, 13, files, {cancelled: () => true, complete: false}),
      ).toThrow()
      expect(service.references(file, 13, files)).toEqual(expected)
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain callers connected through external interfaces and reexports', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-external-')))
    mkdirSync(join(root, 'node_modules/external'), {recursive: true})
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          types: [],
        },
      }),
    )
    writeFileSync(
      join(root, 'node_modules/external/index.d.ts'),
      'export interface Thing { run(): void }',
    )
    writeFileSync(join(root, 'node_modules/external/bridge.ts'), "export {greet} from '../../core'")
    const source =
      "import {Thing} from 'external'; export class MyThing implements Thing { run() {} }; export function greet() {}"
    const sources = {
      'consumer.ts':
        "import {Thing} from 'external'; export function consume(value: Thing) { value.run() }",
      'core.ts': source,
      'reexport.ts': "import {greet} from 'external/bridge'; greet()",
    }
    Object.entries(sources).forEach(([path, text]) => writeFileSync(join(root, path), text))
    const file = join(root, 'core.ts')
    const paths = Object.keys(sources).map((path) => join(root, path))
    for (const index of Array.from({length: 40}, (_, index) => index)) {
      const path = join(root, `noise-${index}.ts`)
      writeFileSync(path, 'export function unrelated() {}')
      paths.push(path)
    }
    const service = createLanguageService(file)
    try {
      service.warm(file)
      expect(
        service
          .references(file, source.indexOf('run'), paths)
          .map((reference) => reference.fileName),
      ).toContain(join(root, 'consumer.ts'))
      expect(
        service
          .references(file, source.indexOf('greet'), paths)
          .map((reference) => reference.fileName),
      ).toContain(join(root, 'reexport.ts'))
      for (const name of ['run', 'greet']) {
        const offset = source.indexOf(name)
        const key = (reference: {fileName: string; textSpan: {start: number}}): string =>
          JSON.stringify([reference.fileName, reference.textSpan.start])
        const expected = service.references(file, offset, paths).map(key).sort()
        // oxlint-disable-next-line no-await-in-loop -- Queries share one language service and its cancellation scope.
        const batches = await Array.fromAsync(service.scanReferences(file, offset, paths))
        expect(batches.length).toBeGreaterThan(1)
        expect([...new Set(batches.flatMap((batch) => batch.map(key)))].sort()).toEqual(expected)
      }
      writeFileSync(join(root, 'node_modules/external/bridge.ts'), 'export function greet() {}')
      expect(
        service
          .references(file, source.indexOf('greet'), paths)
          .map((reference) => reference.fileName),
      ).not.toContain(join(root, 'reexport.ts'))
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain callers using conditional package export modes', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'language-conditional-')))
    mkdirSync(join(root, 'node_modules/bridge'), {recursive: true})
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          noLib: true,
          types: [],
        },
      }),
    )
    writeFileSync(
      join(root, 'node_modules/bridge/package.json'),
      JSON.stringify({
        exports: {import: './esm.mts', require: './cjs.cts'},
        name: 'bridge',
        type: 'module',
      }),
    )
    writeFileSync(join(root, 'node_modules/bridge/esm.mts'), "export {greet} from '../../core.mjs'")
    writeFileSync(join(root, 'node_modules/bridge/cjs.cts'), 'export function greet() {}')
    const source = 'export function greet() {}'
    writeFileSync(join(root, 'core.mts'), source)
    writeFileSync(join(root, 'caller.mts'), "import {greet} from 'bridge'; greet()")
    writeFileSync(join(root, 'other.cts'), "import {greet} from 'bridge'; greet()")
    const file = join(root, 'core.mts')
    const service = createLanguageService(file)
    try {
      service.warm(file)
      const references = service.references(
        file,
        source.indexOf('greet'),
        ['core.mts', 'caller.mts', 'other.cts'].map((path) => join(root, path)),
      )
      expect(references.map((reference) => reference.fileName)).toContain(join(root, 'caller.mts'))
      expect(references.map((reference) => reference.fileName)).not.toContain(
        join(root, 'other.cts'),
      )
    } finally {
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
