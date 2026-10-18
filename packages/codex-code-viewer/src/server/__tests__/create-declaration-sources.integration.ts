import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createDeclarationSources} from '../create-declaration-sources'

describe('createDeclarationSources', () => {
  it.each(['missing', 'malformed', 'multiple', 'outside', 'third-party'] as const)(
    'should retain declarations when the source map is %s',
    (variant) => {
      const directory = realpathSync(mkdtempSync(join(tmpdir(), 'declaration-origin-')))
      const root = join(directory, 'workspace')
      mkdirSync(join(root, 'node_modules/third-party'), {recursive: true})
      const source = 'export function greet() {}'
      writeFileSync(join(root, 'source.ts'), source)
      writeFileSync(join(directory, 'outside.ts'), source)
      const file =
        variant === 'third-party'
          ? join(root, 'node_modules/third-party/source.d.ts')
          : join(root, 'source.d.ts')
      writeFileSync(
        file,
        'export declare function greet(): void;\n//# sourceMappingURL=source.d.ts.map',
      )
      const sources =
        variant === 'outside'
          ? ['../outside.ts']
          : variant === 'multiple'
            ? ['source.ts', 'other.ts']
            : variant === 'missing'
              ? ['missing.ts']
              : ['source.ts']
      writeFileSync(
        `${file}.map`,
        variant === 'malformed'
          ? '{invalid'
          : JSON.stringify({file: 'source.d.ts', mappings: '', sources, version: 3}),
      )
      try {
        expect(createDeclarationSources(root).read(file)).toBeUndefined()
      } finally {
        rmSync(directory, {force: true, recursive: true})
      }
    },
  )
  it('should distinguish declaration module extensions when matching package source subpaths', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'declaration-extension-')))
    mkdirSync(join(root, 'dist'))
    mkdirSync(join(root, 'src'))
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({source: 'src/index.ts', types: 'dist/index.d.ts'}),
    )
    writeFileSync(join(root, 'src/index.ts'), 'export {}')
    writeFileSync(join(root, 'src/entry.ts'), 'export function wrong() {}')
    writeFileSync(join(root, 'src/entry.mts'), 'export function right() {}')
    const file = join(root, 'dist/entry.d.mts')
    writeFileSync(file, 'export declare function right(): void;')
    try {
      expect(createDeclarationSources(root).read(file)).toBe(join(root, 'src/entry.mts'))
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
})
