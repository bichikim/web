import {describe, expect, it} from 'vitest'
import {getWorkspaceRegexList, matchWorkspace} from '../alias'

describe('empty workspace path', () => {
  it('should not treat every path as inside an empty workspace segment', () => {
    const root = '/Users/example/monorepo'
    const importer = `${root}/packages/foo/src/index.ts`

    const result = matchWorkspace(root, getWorkspaceRegexList(['']), importer)

    expect(result).toBeUndefined()
  })

  it('should not treat src/ as a workspace when workspace path is empty', () => {
    const root = '/Users/example/monorepo'
    const importer = `${root}/src/index.ts`

    const result = matchWorkspace(root, getWorkspaceRegexList(['']), importer)

    expect(result).toBeUndefined()
  })
})
