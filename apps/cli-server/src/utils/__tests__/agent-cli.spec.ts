import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveCliWorkingDirectory, tryResolveCliWorkingDirectory} from '../agent-cli'

describe('resolveCliWorkingDirectory', () => {
  const workspaceRoot = '/workspace/project'

  it('should resolve an omitted directory to the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: undefined})).toBe(
      workspaceRoot,
    )
  })

  it('should resolve rooted UI paths inside the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '/apps/coong'})).toBe(
      path.join(workspaceRoot, 'apps/coong'),
    )
  })

  it('should resolve relative paths inside the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: 'apps/coong'})).toBe(
      path.join(workspaceRoot, 'apps/coong'),
    )
  })

  it('should reject parent directory traversal', () => {
    expect(() =>
      resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '../../etc'}),
    ).toThrow('`workingDirectory` must stay within the workspace root.')
  })

  it('should reject rooted UI paths that traverse outside the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '/../other'}),
    ).toThrow('`workingDirectory` must stay within the workspace root.')
  })
})

describe('tryResolveCliWorkingDirectory', () => {
  it('should return an error when the requested directory escapes the workspace root', () => {
    const result = tryResolveCliWorkingDirectory({
      workspaceRoot: '/workspace/project',
      requestedDirectory: '../other',
    })

    expect(result).toEqual({
      error: '`workingDirectory` must stay within the workspace root.',
    })
  })
})
