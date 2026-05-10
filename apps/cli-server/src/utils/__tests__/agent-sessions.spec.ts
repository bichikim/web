import {describe, expect, it} from 'vitest'
import {isSafeAgentSessionId, resolveAgentSessionJsonlFilePath} from '../agent-sessions'

describe('isSafeAgentSessionId', () => {
  it('should reject empty, dot, and path-like session ids', () => {
    expect(isSafeAgentSessionId('')).toBe(false)
    expect(isSafeAgentSessionId('.')).toBe(false)
    expect(isSafeAgentSessionId('..')).toBe(false)
    expect(isSafeAgentSessionId('../other-session')).toBe(false)
    expect(isSafeAgentSessionId('other/session')).toBe(false)
    expect(isSafeAgentSessionId('other\\session')).toBe(false)
  })

  it('should allow plain session ids', () => {
    expect(isSafeAgentSessionId('session-123_abc')).toBe(true)
  })
})

describe('resolveAgentSessionJsonlFilePath', () => {
  it('should reject session ids that could escape the transcript directory', async () => {
    await expect(
      resolveAgentSessionJsonlFilePath({
        sessionId: '../other-session',
        workingDirectory: '/tmp/workspace',
        workspaceRoot: '/tmp/workspace',
      }),
    ).resolves.toBeUndefined()
  })
})
