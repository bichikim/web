import {describe, expect, it, vi} from 'vitest'

import {deletePreviewBranch} from '../../../../scripts/database/delete-preview-branch.mjs'

const input = {
  apiKey: 'test-api-key',
  branchName: 'preview/codex/preview-cleanup',
  projectId: 'falling-leaf-73334177',
}

describe('deletePreviewBranch', () => {
  it('should delete the exact Preview branch', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          branches: [
            {id: 'br-production', name: 'production'},
            {id: 'br-preview', name: input.branchName},
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, {status: 204}))
    const write = vi.fn()

    const result = await deletePreviewBranch(input, {fetchImplementation, write})

    expect(result).toBe('deleted')
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      1,
      new URL(
        'https://console.neon.tech/api/v2/projects/falling-leaf-73334177/branches?limit=10000&search=preview%2Fcodex%2Fpreview-cleanup',
      ),
      expect.objectContaining({headers: expect.any(Object)}),
    )
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      new URL(
        'https://console.neon.tech/api/v2/projects/falling-leaf-73334177/branches/br-preview',
      ),
      expect.objectContaining({method: 'DELETE'}),
    )
    expect(write).toHaveBeenCalledWith(`Deleted Neon Preview branch ${input.branchName}.`)
  })

  it('should succeed when the Preview branch is already absent', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(Response.json({branches: []}))
    const write = vi.fn()

    const result = await deletePreviewBranch(input, {fetchImplementation, write})

    expect(result).toBe('absent')
    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledWith(`Neon Preview branch ${input.branchName} is already absent.`)
  })

  it('should reject a non-Preview branch', () => {
    const promise = deletePreviewBranch({...input, branchName: 'production'})

    return expect(promise).rejects.toThrow('NEON_BRANCH_NAME must start with preview/.')
  })

  it('should reject an invalid branch response', () => {
    const fetchImplementation = vi.fn().mockResolvedValue(Response.json({}))
    const promise = deletePreviewBranch(input, {fetchImplementation})

    return expect(promise).rejects.toThrow('Neon branch response is invalid.')
  })

  it('should reject ambiguous branch matches', () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        branches: [
          {id: 'br-first', name: input.branchName},
          {id: 'br-second', name: input.branchName},
        ],
      }),
    )
    const promise = deletePreviewBranch(input, {fetchImplementation})

    return expect(promise).rejects.toThrow(`Neon Preview branch ${input.branchName} is ambiguous.`)
  })

  it('should reject Neon API failures without exposing the response body', () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response('sensitive provider detail', {status: 401}))
    const promise = deletePreviewBranch(input, {fetchImplementation})

    return expect(promise).rejects.toThrow('Neon API request failed with status 401.')
  })
})
