import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveCliWorkingDirectory} from '../agent-cli'

describe('resolveCliWorkingDirectory', () => {
  const workspaceRoot = path.join(path.sep, 'workspace', 'project')

  it('should resolve virtual absolute paths inside the workspace root', () => {
    expect(resolveCliWorkingDirectory({requestedDirectory: '/apps/cli-server', workspaceRoot})).toBe(
      path.join(workspaceRoot, 'apps', 'cli-server'),
    )
  })

  it('should reject relative paths that escape the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({requestedDirectory: '../outside', workspaceRoot}),
    ).toThrow('Working directory must stay inside the workspace root.')
  })

  it('should reject virtual absolute paths that escape the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({requestedDirectory: '/../outside', workspaceRoot}),
    ).toThrow('Working directory must stay inside the workspace root.')
  })
})
