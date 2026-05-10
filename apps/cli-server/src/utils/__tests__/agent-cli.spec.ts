import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveCliWorkingDirectory} from '../agent-cli'

describe('resolveCliWorkingDirectory', () => {
  const workspaceRoot = path.resolve('/tmp/workspace-root')

  it('should resolve missing and root requests to the workspace root', () => {
    expect(resolveCliWorkingDirectory({requestedDirectory: undefined, workspaceRoot})).toBe(
      workspaceRoot,
    )
    expect(resolveCliWorkingDirectory({requestedDirectory: '/', workspaceRoot})).toBe(workspaceRoot)
  })

  it('should resolve absolute-looking requests relative to the workspace root', () => {
    expect(resolveCliWorkingDirectory({requestedDirectory: '/project', workspaceRoot})).toBe(
      path.join(workspaceRoot, 'project'),
    )
  })

  it('should resolve relative requests inside the workspace root', () => {
    expect(resolveCliWorkingDirectory({requestedDirectory: 'project/src', workspaceRoot})).toBe(
      path.join(workspaceRoot, 'project', 'src'),
    )
  })

  it('should reject parent-directory traversal outside the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({requestedDirectory: '../outside', workspaceRoot}),
    ).toThrow(RangeError)
    expect(() =>
      resolveCliWorkingDirectory({requestedDirectory: 'project/../../outside', workspaceRoot}),
    ).toThrow('workingDirectory must stay within AGENT_WORKSPACE_ROOT.')
  })

  it('should reject virtual absolute paths that escape the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({requestedDirectory: '/../outside', workspaceRoot}),
    ).toThrow('workingDirectory must stay within AGENT_WORKSPACE_ROOT.')
  })
})
