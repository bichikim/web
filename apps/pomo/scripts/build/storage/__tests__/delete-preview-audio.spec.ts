import {describe, expect, it, vi} from 'vitest'

import {deletePreviewAudio} from '../delete-preview-audio.mjs'

const input = {
  accessKeyId: 'access-key',
  accountId: 'account-id',
  bucket: 'pomofi-paid-audio-preview',
  prefix: 'previews/pr-123/',
  secretAccessKey: 'secret-key',
}
const signerFactory = () => ({sign: async (request: Request) => request})

describe('deletePreviewAudio', () => {
  it('should delete every object under one PR Preview prefix', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          '<ListBucketResult>' +
            '<Contents><Key>previews%2Fpr-123%2Fsource.mp3</Key></Contents>' +
            '<Contents><Key>previews%2Fpr-123%2Fpreview%26one.mp3</Key></Contents>' +
            '</ListBucketResult>',
        ),
      )
      .mockResolvedValueOnce(new Response('<DeleteResult />'))
      .mockResolvedValueOnce(new Response('<ListBucketResult />'))
    const write = vi.fn()

    const result = await deletePreviewAudio(input, {
      fetchImplementation,
      signerFactory,
      write,
    })

    expect(result).toBe(2)
    const [listRequest, deleteRequest, emptyListRequest] = fetchImplementation.mock.calls.map(
      ([request]) => request,
    )

    if (
      !(listRequest instanceof Request) ||
      !(deleteRequest instanceof Request) ||
      !(emptyListRequest instanceof Request)
    ) {
      throw new TypeError('Expected R2 cleanup requests')
    }

    expect(listRequest).toBeInstanceOf(Request)
    expect(listRequest?.url).toContain('prefix=previews%2Fpr-123%2F')
    expect(deleteRequest).toBeInstanceOf(Request)
    expect(deleteRequest?.method).toBe('POST')
    expect(await deleteRequest?.text()).toContain(
      '<Object><Key>previews/pr-123/preview&amp;one.mp3</Key></Object>',
    )
    expect(emptyListRequest).toBeInstanceOf(Request)
    expect(write).toHaveBeenCalledWith('Deleted 2 R2 Preview objects under previews/pr-123/.')
  })

  it('should reject a prefix outside one PR namespace', () =>
    expect(deletePreviewAudio({...input, prefix: 'previews/'}, {signerFactory})).rejects.toThrow(
      'POMO_PAID_AUDIO_R2_PREFIX must identify one PR Preview.',
    ))

  it('should reject missing credentials', () =>
    expect(deletePreviewAudio({...input, accessKeyId: ' '}, {signerFactory})).rejects.toThrow(
      'POMO_PAID_AUDIO_R2_ACCESS_KEY_ID is required.',
    ))

  it('should report an R2 listing failure', () =>
    expect(
      deletePreviewAudio(input, {
        fetchImplementation: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(null, {status: 503})),
        signerFactory,
      }),
    ).rejects.toThrow('R2 Preview object listing failed with status 503.'))

  it('should report an R2 deletion failure', () =>
    expect(
      deletePreviewAudio(input, {
        fetchImplementation: vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            new Response(
              '<ListBucketResult><Contents><Key>previews%2Fpr-123%2Fsource.mp3</Key></Contents></ListBucketResult>',
            ),
          )
          .mockResolvedValueOnce(new Response(null, {status: 503})),
        signerFactory,
      }),
    ).rejects.toThrow('R2 Preview object deletion failed with status 503.'))

  it('should report an object-level deletion error', () =>
    expect(
      deletePreviewAudio(input, {
        fetchImplementation: vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            new Response(
              '<ListBucketResult><Contents><Key>previews%2Fpr-123%2Fsource.mp3</Key></Contents></ListBucketResult>',
            ),
          )
          .mockResolvedValueOnce(
            new Response('<DeleteResult><Error><Code>AccessDenied</Code></Error></DeleteResult>'),
          ),
        signerFactory,
      }),
    ).rejects.toThrow('R2 Preview object deletion returned an object error.'))
})
