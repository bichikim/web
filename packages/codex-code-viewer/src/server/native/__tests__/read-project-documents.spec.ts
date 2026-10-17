import typescript from '@typescript/typescript6'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readProjectDocuments} from '../read-project-documents'
import {dirname} from 'node:path'

vi.mock('@typescript/typescript6', async () => {
  const actual =
    await vi.importActual<typeof import('@typescript/typescript6')>('@typescript/typescript6')
  return {default: {...actual, findConfigFile: vi.fn(), getParsedCommandLineOfConfigFile: vi.fn()}}
})

const root = '/workspace'
const configure = (projects: Readonly<Record<string, readonly string[]>>): void => {
  vi.mocked(typescript.findConfigFile).mockImplementation((directory) =>
    Object.keys(projects)
      .sort((left, right) => right.length - left.length)
      .find((path) => directory === dirname(path) || directory.startsWith(`${dirname(path)}/`)),
  )
  vi.mocked(typescript.getParsedCommandLineOfConfigFile).mockImplementation((path) => ({
    errors: [],
    fileNames: [...(projects[path] ?? [])],
    options: {},
  }))
}
afterEach(() => vi.clearAllMocks())
describe('readProjectDocuments', () => {
  it('should open each configured project and retain uncovered consumers', () => {
    configure({
      '/workspace/child/tsconfig.json': ['/workspace/child/entry.ts'],
      '/workspace/tsconfig.json': ['/workspace/entry.ts', '/workspace/child/covered.ts'],
    })
    expect(
      readProjectDocuments(
        root,
        ['entry.ts', 'child/entry.ts', 'child/covered.ts', 'child/outside.ts'],
        typescript.sys,
      ),
    ).toEqual(['entry.ts', 'child/entry.ts', 'child/outside.ts'])
  })
  it('should choose a project member when the preferred source is excluded', () => {
    configure({'/workspace/child/tsconfig.json': ['/workspace/child/included.ts']})
    expect(
      readProjectDocuments(root, ['child/src/outside.ts', 'child/included.ts'], typescript.sys),
    ).toContain('child/included.ts')
  })
  it('should retain files covered only by a project with no visible member', () => {
    configure({'/workspace/child/tsconfig.json': ['/workspace/child/hidden.ts']})
    expect(readProjectDocuments(root, ['child/outside.ts'], typescript.sys)).toEqual([
      'child/outside.ts',
    ])
  })
  it('should discover a configuration once for sibling files', () => {
    configure({})
    expect(
      readProjectDocuments(root, ['one.ts', 'two.ts', 'child/three.ts'], typescript.sys),
    ).toEqual(['one.ts', 'two.ts', 'child/three.ts'])
    expect(typescript.findConfigFile).toHaveBeenCalledTimes(2)
  })
  it('should keep every file when no configured project covers it', () => {
    configure({})
    expect(readProjectDocuments(root, ['one.ts', 'two.ts'], typescript.sys)).toEqual([
      'one.ts',
      'two.ts',
    ])
  })
})
