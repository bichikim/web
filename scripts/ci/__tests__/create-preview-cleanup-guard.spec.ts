/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {createPreviewCleanupGuard} from '../create-preview-cleanup-guard.mjs'

const input = {
  closedAt: '2026-11-24T10:00:53Z',
  pullRequestNumber: '123',
  repository: 'bichikim/web',
  token: 'test-token',
}

describe('createPreviewCleanupGuard', () => {
  it.each([false, true])('should allow the current close with merged=%s', async (merged) => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(Response.json({closed_at: input.closedAt, merged, state: 'closed'}))
    const canDelete = createPreviewCleanupGuard({...input, fetchImplementation})

    await expect(canDelete()).resolves.toBe(true)
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL('https://api.github.com/repos/bichikim/web/pulls/123'),
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: 'Bearer test-token'}),
      }),
    )
  })

  it.each([
    {closed_at: null, state: 'open'},
    {closed_at: '2026-11-24T10:05:00Z', state: 'closed'},
  ])('should skip a reopened PR or an outdated close event (%j)', (pullRequest) => {
    const fetchImplementation = vi.fn().mockResolvedValueOnce(Response.json(pullRequest))
    const canDelete = createPreviewCleanupGuard({...input, fetchImplementation, write: vi.fn()})

    return expect(canDelete()).resolves.toBe(false)
  })

  it('should protect a database branch still used by another open PR', async () => {
    const fetchImplementation = vi.fn().mockResolvedValueOnce(Response.json([{number: 124}]))
    const canDelete = createPreviewCleanupGuard({
      ...input,
      fetchImplementation,
      sharedHeadRef: 'codex/shared-branch',
      write: vi.fn(),
    })

    await expect(canDelete()).resolves.toBe(false)
    expect(fetchImplementation).toHaveBeenCalledExactlyOnceWith(
      new URL(
        'https://api.github.com/repos/bichikim/web/pulls?head=bichikim%3Acodex%2Fshared-branch&per_page=1&state=open',
      ),
      expect.any(Object),
    )
  })

  it('should check the latest PR state after checking who uses the branch', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({closed_at: input.closedAt, state: 'closed'}))
    const canDelete = createPreviewCleanupGuard({
      ...input,
      fetchImplementation,
      sharedHeadRef: 'codex/preview-branch',
    })

    await expect(canDelete()).resolves.toBe(true)
    expect(fetchImplementation).toHaveBeenLastCalledWith(
      new URL('https://api.github.com/repos/bichikim/web/pulls/123'),
      expect.any(Object),
    )
  })

  it('should reject a failed GitHub lookup before authorizing a deletion', () => {
    const fetchImplementation = vi.fn().mockResolvedValueOnce(new Response(null, {status: 503}))
    const canDelete = createPreviewCleanupGuard({...input, fetchImplementation})

    return expect(canDelete()).rejects.toThrow('GitHub PR status lookup failed with status 503.')
  })

  it('should reject an incomplete closed PR response', () => {
    const fetchImplementation = vi.fn().mockResolvedValueOnce(Response.json({state: 'closed'}))
    const canDelete = createPreviewCleanupGuard({...input, fetchImplementation})

    return expect(canDelete()).rejects.toThrow(
      'GitHub PR status lookup returned an invalid response.',
    )
  })
})
