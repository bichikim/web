/** @vitest-environment jsdom */

import {MemoryRouter} from '@solidjs/router'
import {createComponent, type ParentProps} from 'solid-js'
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useTrackManagement} from '../use-track-management'

const creationMocks = vi.hoisted(() => ({
  createTrackWithAudio: vi.fn(),
  removeTrack: vi.fn(),
}))
const uploadMocks = vi.hoisted(() => ({
  confirmTrackAudioRegistration: vi.fn(),
  validateTrackAudio: vi.fn(),
}))

vi.mock('../track-creation', () => creationMocks)
vi.mock('../track-upload', () => uploadMocks)

const AUDIO = new File(['audio'], 'track.mp3', {type: 'audio/mpeg'})

const createSubmitEvent = (
  entries: ReadonlyArray<readonly [string, File | string]> = [
    ['albumId', 'album-one'],
    ['artist', 'Artist'],
    ['audio', AUDIO],
    ['title', 'Title'],
  ],
) => {
  const form = document.createElement('form')
  for (const [key, value] of entries) {
    const input = document.createElement('input')
    input.name = key

    if (value instanceof File) {
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: {0: value, item: () => value, length: 1},
      })
    } else {
      input.value = value
    }

    form.append(input)
  }
  const reset = vi.spyOn(form, 'reset').mockImplementation(() => undefined)
  const preventDefault = vi.fn()
  const event = {currentTarget: form, preventDefault, target: form} as unknown as SubmitEvent & {
    currentTarget: HTMLFormElement
    target: Element
  }

  return {event, preventDefault, reset}
}

const RouterWrapper = (props: ParentProps) =>
  createComponent(MemoryRouter, {root: () => props.children})

const renderTrackManagement = (
  refreshCatalog: () => Promise<void> = vi.fn().mockResolvedValue(undefined),
) => {
  const setMessage = vi.fn()
  const hook = renderHook(() => useTrackManagement({refreshCatalog, setMessage}), {
    wrapper: RouterWrapper,
  })

  return {...hook, refreshCatalog, setMessage}
}

beforeEach(() => {
  vi.resetAllMocks()
  creationMocks.createTrackWithAudio.mockResolvedValue({success: true})
  creationMocks.removeTrack.mockResolvedValue(undefined)
  uploadMocks.confirmTrackAudioRegistration.mockResolvedValue({status: 'active'})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTrackManagement', () => {
  it('should expose editable track fields with idle initial state', () => {
    const {cleanup, result} = renderTrackManagement()

    expect(result.confirmingAssetId()).toBeNull()
    expect(result.isSavingTrack()).toBe(false)
    expect(result.removingTrackId()).toBeNull()
    expect(result.trackArtist()).toBe('')
    expect(result.trackTitle()).toBe('')
    expect(result.trackResetVersion()).toBe(0)

    result.setTrackArtist('Artist')
    result.setTrackTitle('Title')

    expect(result.trackArtist()).toBe('Artist')
    expect(result.trackTitle()).toBe('Title')
    cleanup()
  })

  it('should create a track, reset its form, refresh the catalog, and report success', async () => {
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()
    result.setTrackArtist('Artist')
    result.setTrackTitle('Title')
    const {event, preventDefault, reset} = createSubmitEvent()

    const submission = result.handleTrackSubmit(event)

    expect(result.isSavingTrack()).toBe(true)
    expect(setMessage).toHaveBeenCalledWith(null)
    await submission

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(uploadMocks.validateTrackAudio).toHaveBeenCalledWith(AUDIO)
    expect(creationMocks.createTrackWithAudio).toHaveBeenCalledWith({
      albumId: 'album-one',
      artist: 'Artist',
      audio: AUDIO,
      title: 'Title',
    })
    expect(reset).toHaveBeenCalledOnce()
    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith('곡과 MP3를 앨범에 추가하고 활성화했습니다.')
    expect(result.trackArtist()).toBe('')
    expect(result.trackTitle()).toBe('')
    expect(result.trackResetVersion()).toBe(1)
    expect(result.isSavingTrack()).toBe(false)
    cleanup()
  })

  it.each(['create', 'remove'] as const)(
    'should preserve %s success and retry only the catalog after refresh failure',
    async (operation) => {
      const refreshCatalog = vi.fn().mockRejectedValue(new Error('catalog HTTP 500'))
      const {cleanup, result} = renderTrackManagement(refreshCatalog)
      const {event, reset} = createSubmitEvent()
      result.setTrackTitle('Title')
      result.setTrackArtist('Artist')

      if (operation === 'create') {
        await result.handleTrackSubmit(event)
        expect(reset).toHaveBeenCalledOnce()
        expect(result.trackTitle()).toBe('')
        expect(result.trackArtist()).toBe('')
        expect(result.isSavingTrack()).toBe(false)
      } else {
        await result.handleTrackRemove('track-one')
        expect(result.isRemovingTrack('track-one')).toBe(false)
      }

      const message =
        operation === 'create'
          ? '곡과 MP3를 앨범에 추가하고 활성화했습니다.'
          : '수록곡과 MP3 파일을 삭제했습니다.'
      expect(result.catalogRefreshMessage()).toBe(`${message} 목록을 새로고침하지 못했습니다.`)
      await result.handleCatalogRetry()
      expect(result.catalogRefreshMessage()).toContain(message)

      const refresh = Promise.withResolvers<void>()
      refreshCatalog.mockReturnValueOnce(refresh.promise)
      const retry = result.handleCatalogRetry()
      expect(result.isRefreshingCatalog()).toBe(true)
      await result.handleCatalogRetry()
      expect(refreshCatalog).toHaveBeenCalledTimes(3)
      refresh.resolve()
      await retry

      expect(result.catalogRefreshMessage()).toBeNull()
      expect(result.isRefreshingCatalog()).toBe(false)
      expect(creationMocks.createTrackWithAudio).toHaveBeenCalledTimes(
        operation === 'create' ? 1 : 0,
      )
      expect(creationMocks.removeTrack).toHaveBeenCalledTimes(operation === 'remove' ? 1 : 0)
      cleanup()
    },
  )

  it.each(['ready', 'failed'] as const)(
    'should ignore an older %s refresh result after a newer track operation refresh',
    async (olderStatus) => {
      const olderRefresh = Promise.withResolvers<void>()
      const refreshCatalog = vi.fn().mockReturnValueOnce(olderRefresh.promise)
      if (olderStatus === 'ready') {
        refreshCatalog.mockRejectedValueOnce(new Error('newer refresh failed'))
      } else {
        refreshCatalog.mockResolvedValueOnce(undefined)
      }
      const {cleanup, result, setMessage} = renderTrackManagement(refreshCatalog)
      const first = result.handleTrackRemove('track-one')
      await waitFor(() => expect(refreshCatalog).toHaveBeenCalledOnce())
      await result.handleTrackRemove('track-two')
      const latestMessage = result.catalogRefreshMessage()
      setMessage.mockClear()

      if (olderStatus === 'ready') {
        olderRefresh.resolve()
      } else {
        olderRefresh.reject(new Error('older refresh failed'))
      }
      await first

      expect(result.catalogRefreshMessage()).toBe(latestMessage)
      expect(setMessage).not.toHaveBeenCalled()
      cleanup()
    },
  )

  it('should retire an old retry notice while refreshing a newer confirmation', async () => {
    const confirmationRefresh = Promise.withResolvers<void>()
    const refreshCatalog = vi
      .fn()
      .mockRejectedValue(new Error('retry failed'))
      .mockRejectedValueOnce(new Error('deletion refresh failed'))
      .mockReturnValueOnce(confirmationRefresh.promise)
    const {cleanup, result} = renderTrackManagement(refreshCatalog)
    await result.handleTrackRemove('track-one')
    const confirmation = result.handleTrackConfirmation('asset-one')
    await waitFor(() => expect(refreshCatalog).toHaveBeenCalledTimes(2))

    expect(result.catalogRefreshMessage()).toBeNull()
    await result.handleCatalogRetry()
    expect(refreshCatalog).toHaveBeenCalledTimes(2)
    confirmationRefresh.reject(new Error('confirmation refresh failed'))
    await confirmation
    expect(result.catalogRefreshMessage()).toBe(
      'MP3 등록을 확인하고 수록곡을 활성화했습니다. 목록을 새로고침하지 못했습니다.',
    )
    cleanup()
  })

  it('should report a failed upload whose created track was cleaned up', async () => {
    creationMocks.createTrackWithAudio.mockResolvedValueOnce({
      cleanupStatus: 'succeeded',
      error: new Error('업로드 실패'),
      success: false,
    })
    const refreshCatalog = vi.fn().mockRejectedValue(new Error('refresh failed'))
    const {cleanup, result, setMessage} = renderTrackManagement(refreshCatalog)
    const {event, reset} = createSubmitEvent([['audio', AUDIO]])

    await result.handleTrackSubmit(event)

    expect(creationMocks.createTrackWithAudio).toHaveBeenCalledWith({
      albumId: '',
      artist: '',
      audio: AUDIO,
      title: '',
    })
    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith('업로드 실패 생성된 곡 정보는 정리했습니다.')
    expect(reset).not.toHaveBeenCalled()
    expect(result.isSavingTrack()).toBe(false)
    cleanup()
  })

  it('should report a generic failed upload whose created track remains', async () => {
    creationMocks.createTrackWithAudio.mockResolvedValueOnce({
      cleanupStatus: 'failed',
      error: 'upload failed',
      success: false,
    })
    const {cleanup, result, setMessage} = renderTrackManagement()

    await result.handleTrackSubmit(createSubmitEvent().event)

    expect(setMessage).toHaveBeenLastCalledWith(
      '곡을 저장하지 못했습니다. 생성된 곡 정보를 정리하지 못했습니다. 다시 삭제해 주세요.',
    )
    expect(result.isSavingTrack()).toBe(false)
    cleanup()
  })

  it('should explain that an unconfirmed registration was preserved', async () => {
    creationMocks.createTrackWithAudio.mockResolvedValueOnce({
      cleanupStatus: 'preserved',
      error: new Error('MP3 등록 상태를 확인하지 못했습니다.'),
      success: false,
    })
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()

    await result.handleTrackSubmit(createSubmitEvent().event)

    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith(
      'MP3 등록 상태를 확인하지 못했습니다. 등록 결과가 확정되지 않아 곡은 삭제하지 않았습니다. 목록에서 상태를 확인해 주세요.',
    )
    cleanup()
  })

  it('should reject a submission without an MP3 file', async () => {
    const {cleanup, result, setMessage} = renderTrackManagement()

    await result.handleTrackSubmit(createSubmitEvent([]).event)

    expect(uploadMocks.validateTrackAudio).not.toHaveBeenCalled()
    expect(creationMocks.createTrackWithAudio).not.toHaveBeenCalled()
    expect(setMessage).toHaveBeenLastCalledWith('MP3 파일을 선택해 주세요.')
    expect(result.isSavingTrack()).toBe(false)
    cleanup()
  })

  it('should report a generic message for a non-error submission failure', async () => {
    creationMocks.createTrackWithAudio.mockRejectedValueOnce('network unavailable')
    const {cleanup, result, setMessage} = renderTrackManagement()

    await result.handleTrackSubmit(createSubmitEvent().event)

    expect(setMessage).toHaveBeenLastCalledWith('곡을 저장하지 못했습니다.')
    expect(result.isSavingTrack()).toBe(false)
    cleanup()
  })

  it('should confirm a pending asset, refresh the catalog, and report activation', async () => {
    let finishConfirmation: ((result: {status: 'active'}) => void) | undefined
    uploadMocks.confirmTrackAudioRegistration.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishConfirmation = resolve
        }),
    )
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()

    const confirmation = result.handleTrackConfirmation('asset-one')

    expect(result.confirmingAssetId()).toBe('asset-one')
    expect(setMessage).toHaveBeenCalledWith(null)
    finishConfirmation?.({status: 'active'})
    await confirmation

    expect(uploadMocks.confirmTrackAudioRegistration).toHaveBeenCalledWith('asset-one')
    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith('MP3 등록을 확인하고 수록곡을 활성화했습니다.')
    expect(result.confirmingAssetId()).toBeNull()
    cleanup()
  })

  it.each(['active', 'unconfirmed'] as const)(
    'should preserve an %s confirmation result when catalog refresh fails',
    async (status) => {
      uploadMocks.confirmTrackAudioRegistration.mockResolvedValueOnce({status})
      const {cleanup, result} = renderTrackManagement(
        vi.fn().mockRejectedValue(new Error('catalog HTTP 500')),
      )

      await result.handleTrackConfirmation('asset-one')

      expect(result.catalogRefreshMessage()).toBe(
        status === 'active'
          ? 'MP3 등록을 확인하고 수록곡을 활성화했습니다. 목록을 새로고침하지 못했습니다.'
          : '등록 결과를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요. 목록을 새로고침하지 못했습니다.',
      )
      expect(result.isConfirmingAsset('asset-one')).toBe(false)
      cleanup()
    },
  )

  it('should preserve and explain an ambiguously confirmed asset', async () => {
    uploadMocks.confirmTrackAudioRegistration.mockResolvedValueOnce({
      error: new Error('network unavailable'),
      status: 'unconfirmed',
    })
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()

    await result.handleTrackConfirmation('asset-one')

    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith(
      '등록 결과를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    )
    expect(result.confirmingAssetId()).toBeNull()
    cleanup()
  })

  it('should refresh and report a definitive confirmation failure', async () => {
    uploadMocks.confirmTrackAudioRegistration.mockRejectedValueOnce(new Error('검증 실패'))
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()

    await result.handleTrackConfirmation('asset-one')

    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith('검증 실패')
    expect(result.confirmingAssetId()).toBeNull()
    cleanup()
  })

  it('should tolerate refresh failure after a non-error confirmation failure', async () => {
    uploadMocks.confirmTrackAudioRegistration.mockRejectedValueOnce('network unavailable')
    const refreshCatalog = vi.fn().mockRejectedValue(new Error('refresh failed'))
    const {cleanup, result, setMessage} = renderTrackManagement(refreshCatalog)

    await result.handleTrackConfirmation('asset-one')

    expect(setMessage).toHaveBeenLastCalledWith('MP3 등록을 확인하지 못했습니다.')
    expect(result.confirmingAssetId()).toBeNull()
    cleanup()
  })

  it('should remove a track, refresh the catalog, and restore its idle state', async () => {
    let finishRemoval: (() => void) | undefined
    creationMocks.removeTrack.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRemoval = resolve
        }),
    )
    const {cleanup, refreshCatalog, result, setMessage} = renderTrackManagement()

    const removal = result.handleTrackRemove('track-one')

    expect(result.removingTrackId()).toBe('track-one')
    expect(setMessage).toHaveBeenCalledWith(null)
    finishRemoval?.()
    await removal

    expect(creationMocks.removeTrack).toHaveBeenCalledWith('track-one')
    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(setMessage).toHaveBeenLastCalledWith('수록곡과 MP3 파일을 삭제했습니다.')
    expect(result.removingTrackId()).toBeNull()
    cleanup()
  })

  it('should track concurrent removals independently', async () => {
    const firstRemoval = Promise.withResolvers<void>()
    const secondRemoval = Promise.withResolvers<void>()
    creationMocks.removeTrack
      .mockReturnValueOnce(firstRemoval.promise)
      .mockReturnValueOnce(secondRemoval.promise)
    const {cleanup, result} = renderTrackManagement()

    const firstRequest = result.handleTrackRemove('track-one')
    const secondRequest = result.handleTrackRemove('track-two')

    expect(result.isRemovingTrack('track-one')).toBe(true)
    expect(result.isRemovingTrack('track-two')).toBe(true)
    firstRemoval.resolve()
    await firstRequest
    expect(result.isRemovingTrack('track-one')).toBe(false)
    expect(result.isRemovingTrack('track-two')).toBe(true)
    secondRemoval.resolve()
    await secondRequest
    expect(result.isRemovingTrack('track-two')).toBe(false)
    cleanup()
  })

  it('should report an error encountered while removing a track', async () => {
    creationMocks.removeTrack.mockRejectedValueOnce(new Error('삭제 실패'))
    const {cleanup, result, setMessage} = renderTrackManagement()

    await result.handleTrackRemove('track-one')

    expect(setMessage).toHaveBeenLastCalledWith('삭제 실패')
    expect(result.removingTrackId()).toBeNull()
    cleanup()
  })

  it('should report a generic message for a non-error track removal failure', async () => {
    creationMocks.removeTrack.mockRejectedValueOnce('network unavailable')
    const {cleanup, result, setMessage} = renderTrackManagement()

    await result.handleTrackRemove('track-one')

    expect(setMessage).toHaveBeenLastCalledWith('수록곡을 삭제하지 못했습니다.')
    expect(result.removingTrackId()).toBeNull()
    cleanup()
  })
})
