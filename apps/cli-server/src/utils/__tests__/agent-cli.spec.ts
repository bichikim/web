import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveCliWorkingDirectory} from '../agent-cli'

describe('resolveCliWorkingDirectory', () => {
  const workspaceRoot = path.resolve('/workspace/project')

  it('should resolve an omitted working directory to the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: undefined})).toBe(
      workspaceRoot,
    )
  })

  it('should resolve a relative working directory inside the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: 'apps/cli-server'})).toBe(
      path.join(workspaceRoot, 'apps/cli-server'),
    )
  })

  it('should resolve a slash-prefixed working directory relative to the workspace root', () => {
    expect(resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '/apps/cli-server'})).toBe(
      path.join(workspaceRoot, 'apps/cli-server'),
    )
  })

  it('should reject relative paths that escape the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '../private-repo'}),
    ).toThrow('`workingDirectory` must stay within AGENT_WORKSPACE_ROOT.')
  })

  it('should reject slash-prefixed paths that escape the workspace root', () => {
    expect(() =>
      resolveCliWorkingDirectory({workspaceRoot, requestedDirectory: '/../private-repo'}),
    ).toThrow('`workingDirectory` must stay within AGENT_WORKSPACE_ROOT.')
  })
})
