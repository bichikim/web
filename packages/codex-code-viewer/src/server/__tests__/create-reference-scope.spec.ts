import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createReferenceScope} from '../create-reference-scope'
interface TypeScriptModule {
  readonly default: typeof typescript
}
vi.mock('@typescript/typescript6', async () => {
  const actual = await vi.importActual<TypeScriptModule>('@typescript/typescript6')
  return {...actual, default: {...actual.default, resolveModuleName: vi.fn()}}
})
beforeEach(() => {
  vi.mocked(typescript.resolveModuleName).mockImplementation((specifier, file) => ({
    resolvedModule: {
      extension: typescript.Extension.Ts,
      resolvedFileName: resolve(dirname(file), `${specifier}.ts`),
    },
  }))
})
afterEach(() => vi.clearAllMocks())
const scopeFor = (sources: Readonly<Record<string, string>>) =>
  createReferenceScope({options: {}, read: (path) => sources[path]})
describe('createReferenceScope', () => {
  it('should stop inspecting unrelated sources once an external import requires the full context', () => {
    const sources: Record<string, string> = {
      '/core.ts': 'export const greet = 1',
      '/external.ts': "import {value} from 'package'; export {value}",
      '/unrelated.ts': 'export const other = 1',
    }
    const read = vi.fn((path: string) => sources[path])
    const scope = createReferenceScope({
      options: {},
      read,
      resolveModule: (path, specifier) => [resolve(dirname(path), `${specifier}.ts`)],
    })
    expect(scope('/core.ts', Object.keys(sources))).toEqual(Object.keys(sources))
    expect(read).not.toHaveBeenCalledWith('/unrelated.ts')
    sources['/external.ts'] = 'export const value = 2'
    expect(scope('/core.ts', Object.keys(sources))).toEqual(['/core.ts'])
  })
  it('should retain external aliases, re-exports and JSDoc imports while excluding disconnected modules', () => {
    const sources = {
      '/app/caller.ts': "import {welcome as hello} from '../core/barrel'; hello()",
      '/app/documented.ts': '/** @typedef {import("../core/entry").greet} Greet */\nexport {}',
      '/core/barrel.ts': "export {greet as welcome} from './entry'",
      '/core/entry.ts': 'export const greet = () => 1',
      '/unrelated.ts': 'export const greet = 2',
    }
    expect(scopeFor(sources)('/core/entry.ts', Object.keys(sources))).toEqual(
      Object.keys(sources).filter((path) => path !== '/unrelated.ts'),
    )
  })
  it('should include ambient sources without pulling disconnected reverse importers into a module query', () => {
    const sources = {
      '/core.ts': 'export const greet = 1',
      '/globals.ts': 'declare const ambient: number',
      '/other.ts': "import './globals'; export const other = 1",
    }
    const scope = scopeFor(sources)
    expect(scope('/core.ts', Object.keys(sources))).toEqual(['/core.ts', '/globals.ts'])
    expect(scope('/globals.ts', Object.keys(sources))).toEqual(Object.keys(sources))
  })
  it('should recompute changed imports and retain the full context when a source cannot be read', () => {
    const sources: Record<string, string> = {
      '/core.ts': 'export const greet = 1',
      '/other.ts': 'export const other = 1',
    }
    const scope = scopeFor(sources)
    expect(scope('/core.ts', Object.keys(sources))).toEqual(['/core.ts'])
    sources['/other.ts'] = "import {greet} from './core'; greet()"
    expect(scope('/core.ts', Object.keys(sources))).toEqual(Object.keys(sources))
    expect(scope('/core.ts', [...Object.keys(sources), '/missing.ts'])).toContain('/missing.ts')
  })
  it('should stop scanning when a newer request cancels analysis', () => {
    expect(() =>
      scopeFor({'/core.ts': 'export const greet = 1'})('/core.ts', ['/core.ts'], () => true),
    ).toThrow(typescript.OperationCanceledException)
  })
  it('should rebuild dependencies when cancellation interrupts an import update', () => {
    const sources: Record<string, string> = {
      '/core.ts': 'export const greet = 1',
      '/other.ts': 'export const other = 1',
      '/tail.ts': 'export const tail = 1',
    }
    const scope = scopeFor(sources)
    const paths = Object.keys(sources)
    expect(scope('/core.ts', paths)).toEqual(['/core.ts'])
    sources['/other.ts'] = "import {greet} from './core'; greet()"
    let checks = 0
    expect(() =>
      scope('/core.ts', paths, () => {
        checks += 1
        return checks === 4
      }),
    ).toThrow()
    expect(scope('/core.ts', paths)).toEqual(['/core.ts', '/other.ts'])
  })
})
