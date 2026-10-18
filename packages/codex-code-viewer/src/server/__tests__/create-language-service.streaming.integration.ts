import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import * as compilerSources from '../read-compiler-source'
import {describe, expect, it, vi} from 'vitest'
import {createLanguageService} from '../create-language-service'

describe('createLanguageService initial discoveries', () => {
  it('should yield module usages before loading unrelated roots and complete external aliases', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'initial-references-')))
    mkdirSync(join(root, 'core'))
    mkdirSync(join(root, 'outside'))
    const source = 'export function greet() {}'
    writeFileSync(
      join(root, 'tsconfig.json'),
      '{"compilerOptions":{"noLib":true,"types":[],"moduleResolution":"bundler"}}',
    )
    const sources = {
      'core/caller.ts': "import {greet as hello} from './entry'; hello()",
      'core/entry.ts': source,
      'outside/bridge.ts': "export {greet as welcome} from '../core/entry'",
      'outside/usage.ts': "import {welcome as hello} from './bridge'; hello()",
    }
    Object.entries(sources).forEach(([path, text]) => writeFileSync(join(root, path), text))
    const unrelated = Array.from({length: 400}, (_, index) => join(root, `unrelated-${index}.ts`))
    unrelated.forEach((path) => writeFileSync(path, 'export const greet = 2'))
    const files = [...Object.keys(sources).map((path) => join(root, path)), ...unrelated]
    const file = join(root, 'core/entry.ts')
    const read = vi.spyOn(compilerSources, 'readCompilerSource')
    const service = createLanguageService(file)
    const key = (reference: {fileName: string; textSpan: {start: number}}): string =>
      JSON.stringify([reference.fileName, reference.textSpan.start])
    try {
      const stream = service.scanReferences(file, source.indexOf('greet'), files)
      const first = await stream.next()
      expect(first.value?.map((entry) => entry.fileName)).toContain(join(root, 'core/caller.ts'))
      expect(read).toHaveBeenCalledWith(join(root, 'core/caller.ts'))
      expect(read).not.toHaveBeenCalledWith(unrelated.at(-1))
      const remaining = await Array.fromAsync(stream)
      expect(read).toHaveBeenCalledWith(unrelated.at(-1))
      const found = [...new Set([...(first.value ?? []), ...remaining.flat()].map(key))].sort()
      expect(found).toEqual(
        service.references(file, source.indexOf('greet'), files).map(key).sort(),
      )
      expect(found).toContain(
        JSON.stringify([
          join(root, 'outside/usage.ts'),
          sources['outside/usage.ts'].lastIndexOf('hello'),
        ]),
      )
      const warm = service.scanReferences(file, source.indexOf('greet'), files)
      const cached = await warm.next()
      expect(cached.value?.map(key)).toContain(
        JSON.stringify([
          join(root, 'outside/usage.ts'),
          sources['outside/usage.ts'].lastIndexOf('hello'),
        ]),
      )
      await warm.return(undefined)
    } finally {
      read.mockRestore()
      service.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
