/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {useTrackImport} from '../use-track-import'

const files = () => [new File(['one'], 'one.mp3'), new File(['two'], 'two.mp3')]

const setup = () => {
  const createTrack = vi.fn().mockResolvedValue({status: 'created'})
  const hook = renderHook(() => useTrackImport({albumId: () => 'album', createTrack}))
  return {...hook, createTrack}
}

const fill = (result: ReturnType<typeof useTrackImport>) => {
  for (const track of result.tracks) {
    result.updateTrack(track.id, 'title', track.audio.name)
    result.updateTrack(track.id, 'artist', 'Artist')
  }
}

describe('useTrackImport', () => {
  it('should append valid MP3 files, ignore duplicates, and report invalid files', () => {
    const {result, cleanup} = setup()
    const selected = files()
    result.addFiles(selected)
    result.addFiles([...selected, new File(['image'], 'cover.png')])
    expect(result.tracks).toHaveLength(2)
    expect(result.message()).toContain('cover.png')
    result.removeTrack(result.tracks[0].id)
    expect(result.tracks[0].audio).toBe(selected[1])
    cleanup()
  })

  it('should keep distinct files whose names, sizes, and modification times match', () => {
    const {result, cleanup} = setup()
    const first = new File(['aaa'], 'track.mp3', {lastModified: 0})
    const second = new File(['bbb'], 'track.mp3', {lastModified: 0})
    result.addFiles([first, second])
    expect(result.tracks.map((track) => track.audio)).toEqual([first, second])
    cleanup()
  })

  it.each([
    ['title', ''],
    ['artist', '   '],
    ['title', 'x'.repeat(121)],
    ['artist', 'x'.repeat(121)],
  ] as const)('should reject invalid %s before uploading any queued file', async (field, value) => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    result.updateTrack(result.tracks[1].id, field, value)
    expect(await result.submit()).toBeUndefined()
    expect(createTrack).not.toHaveBeenCalled()
    expect(result.message()).toContain('제목과 아티스트')
    cleanup()
  })

  it('should not produce a batch result for an empty queue', async () => {
    const {result, createTrack, cleanup} = setup()
    expect(await result.submit()).toBeUndefined()
    expect(createTrack).not.toHaveBeenCalled()
    cleanup()
  })

  it.each([
    ['succeeded', 'failed', '생성된 곡 정보는 정리했습니다.', 2],
    ['failed', 'preserved', '다시 삭제해 주세요.', 1],
  ] as const)(
    'should handle cleanup %s before retry',
    async (cleanupStatus, status, detail, calls) => {
      const {result, createTrack, cleanup} = setup()
      result.addFiles([files()[0]])
      fill(result)
      createTrack.mockResolvedValueOnce({cleanupStatus, detail: '업로드 실패', status: 'failed'})
      const summary = await result.submit()
      expect(summary).toEqual({
        created: 0,
        failed: status === 'failed' ? 1 : 0,
        preserved: status === 'preserved' ? 1 : 0,
      })
      expect(result.tracks[0].detail).toContain(detail)
      await result.submit()
      expect(createTrack).toHaveBeenCalledTimes(calls)
      cleanup()
    },
  )

  it('should submit each file with its own fields and never resubmit completed rows', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    expect(await result.submit()).toEqual({created: 2, failed: 0, preserved: 0})
    expect(createTrack).toHaveBeenCalledTimes(2)
    expect(createTrack.mock.calls.map(([form]) => form.get('title'))).toEqual([
      'one.mp3',
      'two.mp3',
    ])
    expect(createTrack.mock.calls.map(([form]) => form.get('audio').name)).toEqual([
      'one.mp3',
      'two.mp3',
    ])
    await result.submit()
    expect(createTrack).toHaveBeenCalledTimes(2)
    cleanup()
  })

  it('should retain failures for retry but preserve uncertain registrations without duplication', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    createTrack.mockResolvedValueOnce({
      cleanupStatus: 'preserved',
      detail: '확인 필요',
      status: 'failed',
    })
    createTrack.mockResolvedValueOnce({detail: '다시 시도', status: 'rejected'})
    expect(await result.submit()).toEqual({created: 0, failed: 1, preserved: 1})
    expect(result.tracks.map((track) => track.status)).toEqual(['preserved', 'failed'])
    await result.submit()
    expect(createTrack).toHaveBeenCalledTimes(3)
    expect(createTrack.mock.calls[2][0].get('audio').name).toBe('two.mp3')
    cleanup()
  })

  it('should block submission while metadata is reading', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    result.setReading(result.tracks[0].id, true)
    await result.submit()
    expect(createTrack).not.toHaveBeenCalled()
    cleanup()
  })
  it('should prevent overlapping submissions and changes while saving', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    let finish: (value: {status: string}) => void = () => undefined
    createTrack.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const saving = result.submit()
    expect(result.isSaving()).toBe(true)
    await result.submit()
    result.addFiles([new File(['third'], 'third.mp3')])
    result.removeTrack(result.tracks[0].id)
    result.updateTrack(result.tracks[0].id, 'title', 'Changed')
    expect(result.tracks).toHaveLength(2)
    expect(result.tracks[0].title).toBe('one.mp3')
    expect(createTrack).toHaveBeenCalledTimes(1)
    finish({status: 'created'})
    await saving
    expect(createTrack).toHaveBeenCalledTimes(2)
    expect(result.isSaving()).toBe(false)
    cleanup()
  })

  it('should finish the current upload but not start another after the form is disposed', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    let finish: (value: {status: string}) => void = () => undefined
    createTrack.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const saving = result.submit()
    cleanup()
    finish({status: 'created'})
    expect(await saving).toEqual({created: 1, failed: 0, preserved: 0})
    expect(createTrack).toHaveBeenCalledTimes(1)
  })

  it('should require registration checks after unexpected action errors', async () => {
    const {result, createTrack, cleanup} = setup()
    result.addFiles(files())
    fill(result)
    createTrack.mockRejectedValueOnce(new Error('response lost'))
    await result.submit()
    expect(result.tracks[0].status).toBe('preserved')
    await result.submit()
    expect(createTrack).toHaveBeenCalledTimes(2)
    cleanup()
  })
})
