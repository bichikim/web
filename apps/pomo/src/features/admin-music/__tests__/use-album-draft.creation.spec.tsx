/** @vitest-environment jsdom */

import {waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {
  COVER_DRAFT_ID,
  createSubmitEvent,
  renderAlbumDraft,
  RENEWED_ALBUM_ID,
  storageMocks,
  waitForRestoration,
} from './fixtures/draft'

describe('album creation', () => {
  it('should finish pending field persistence before deleting a created album draft', async () => {
    const operations: string[] = []
    storageMocks.writeAlbumDraftData.mockImplementation(() => {
      operations.push('write')
      return {success: true}
    })
    const {cleanup, result, setMessage} = renderAlbumDraft()
    setMessage.mockImplementation((message) => {
      if (message === '앨범 초안을 만들었습니다.') {
        operations.push('created')
      }
    })
    await waitForRestoration(result)

    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://example.com/current.webp'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    await result.handleAlbumSubmit(createSubmitEvent().event)
    await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(setMessage).toHaveBeenLastCalledWith('앨범 초안을 만들었습니다.'))

    expect(fetch).toHaveBeenCalledOnce()
    expect(operations).toEqual(['write', 'write', 'created'])
    cleanup()
  })
  it('should reuse the album ID after a lost creation response', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({id: COVER_DRAFT_ID}), {
          headers: {'Content-Type': 'application/json'},
          status: 201,
        }),
      )
    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleAlbumSubmit(createSubmitEvent().event)
    await result.handleAlbumSubmit(createSubmitEvent().event)

    const requestIds = vi
      .mocked(fetch)
      .mock.calls.map((call) => JSON.parse(String(call[1]?.body)).id as unknown)
    expect(requestIds).toEqual([COVER_DRAFT_ID, COVER_DRAFT_ID])
    cleanup()
  })

  it('should renew the album ID after a creation payload conflict', async () => {
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
      .mockReturnValueOnce(COVER_DRAFT_ID)
      .mockReturnValue(RENEWED_ALBUM_ID)
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json({error: 'album_creation_payload_mismatch'}, {status: 409}),
      )
      .mockResolvedValueOnce(
        Response.json({id: RENEWED_ALBUM_ID}, {headers: {'Content-Type': 'application/json'}}),
      )
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleAlbumSubmit(createSubmitEvent().event)
    await waitFor(() =>
      expect(setMessage).toHaveBeenLastCalledWith(
        '이전 요청에서 앨범이 이미 만들어졌습니다. 현재 입력은 유지하고 새 앨범 ID로 전환했습니다. 목록에서 기존 앨범을 확인한 뒤 필요하면 다시 저장해 주세요.',
      ),
    )
    await result.handleAlbumSubmit(createSubmitEvent().event)

    const requestIds = vi
      .mocked(fetch)
      .mock.calls.map((call) => JSON.parse(String(call[1]?.body)).id as unknown)
    expect(requestIds).toEqual([COVER_DRAFT_ID, RENEWED_ALBUM_ID])
    cleanup()
  })
})
