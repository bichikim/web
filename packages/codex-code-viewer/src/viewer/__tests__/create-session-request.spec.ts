import {describe, expect, it, vi} from 'vitest'
import {z} from 'zod'
import type {ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {createSessionRequest} from '../create-session-request'

const port = (): ViewerPort => ({
  call: vi.fn().mockResolvedValue({content: [], structuredContent: {paths: ['main.ts']}}),
  context: vi.fn(),
  start: vi.fn(),
})
const schema = z.object({paths: z.array(z.string())})
const session: ViewerSession = {
  document: {lines: [], location: {column: 1, line: 1, path: 'main.ts'}, revision: '1', source: ''},
  session: 'first',
  workspace: '/project',
}

describe('createSessionRequest', () => {
  it('should reject before calling a tool when no viewer session is active', async () => {
    const host = port()
    const request = createSessionRequest({port: host, session: () => null})
    await expect(request('code.list', {}, schema)).rejects.toThrow('파일을 먼저')
    expect(host.call).not.toHaveBeenCalled()
  })
  it('should attach the current session rather than reuse a previous session', async () => {
    const host = port()
    let current = session
    const request = createSessionRequest({port: host, session: () => current})
    await request('code.list', {query: 'main'}, schema)
    expect(host.call).toHaveBeenLastCalledWith('code.list', {query: 'main', session: 'first'})
    current = {...session, session: 'next'}
    await expect(request('code.list', {query: 'next'}, schema)).resolves.toEqual({
      paths: ['main.ts'],
    })
    expect(host.call).toHaveBeenLastCalledWith('code.list', {query: 'next', session: 'next'})
  })
})
