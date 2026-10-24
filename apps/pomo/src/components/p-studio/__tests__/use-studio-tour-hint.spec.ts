/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  readFocusRoomEntryHistory,
  writeFocusRoomEntryHistory,
} from 'src/features/focus-room-entry-history'
import {readFocusRoomEntrySession} from 'src/features/focus-room-entry'
import {useStudioTourHint} from '../use-studio-tour-hint'

vi.mock('src/features/focus-room-entry-history', () => ({
  readFocusRoomEntryHistory: vi.fn(),
  writeFocusRoomEntryHistory: vi.fn(),
}))
vi.mock('src/features/focus-room-entry', () => ({readFocusRoomEntrySession: vi.fn()}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readFocusRoomEntryHistory).mockResolvedValue(false)
  vi.mocked(writeFocusRoomEntryHistory).mockResolvedValue()
  vi.mocked(readFocusRoomEntrySession).mockReturnValue(false)
})

describe('useStudioTourHint', () => {
  it('should show the first entry hint and persist entry immediately', async () => {
    const {result} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
    await result.enter()
    expect(result.visible()).toBe(true)
    expect(writeFocusRoomEntryHistory).toHaveBeenCalledOnce()
    result.dismiss()
    expect(result.visible()).toBe(false)
  })

  it('should suppress the hint on a later session', async () => {
    vi.mocked(readFocusRoomEntryHistory).mockResolvedValue(true)
    const {result} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
    await result.enter()
    expect(result.visible()).toBe(false)
  })

  it('should migrate an already entered session without displaying the hint', async () => {
    vi.mocked(readFocusRoomEntrySession).mockReturnValue(true)
    const {result} = renderHook(() => useStudioTourHint(() => false, vi.fn()))
    await waitFor(() => expect(writeFocusRoomEntryHistory).toHaveBeenCalledOnce())
    expect(result.visible()).toBe(false)
    await result.enter()
    expect(readFocusRoomEntryHistory).not.toHaveBeenCalled()
  })

  it('should not reopen a hint after the tour opens while storage is pending', async () => {
    const pending = Promise.withResolvers<boolean>()
    vi.mocked(readFocusRoomEntryHistory).mockReturnValue(pending.promise)
    const openTour = vi.fn()
    const {result} = renderHook(() => useStudioTourHint(() => true, openTour))
    const entering = result.enter()
    result.openTour()
    pending.resolve(false)
    await entering
    expect(result.visible()).toBe(false)
    expect(openTour).toHaveBeenCalledOnce()
    expect(writeFocusRoomEntryHistory).toHaveBeenCalledOnce()
  })

  it('should not show a late hint after disposal', async () => {
    const pending = Promise.withResolvers<boolean>()
    vi.mocked(readFocusRoomEntryHistory).mockReturnValue(pending.promise)
    const {result, cleanup} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
    const entering = result.enter()
    cleanup()
    pending.resolve(false)
    await entering
    expect(result.visible()).toBe(false)
  })

  it('should keep the first hint usable if persisting entry fails', async () => {
    vi.mocked(writeFocusRoomEntryHistory).mockRejectedValue(new Error('blocked'))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const {result} = renderHook(() => useStudioTourHint(() => true, vi.fn()))
    await result.enter()
    expect(result.visible()).toBe(true)
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })

  it('should keep entry available and suppress uncertain first-visit status on read failure', async () => {
    vi.mocked(readFocusRoomEntryHistory).mockRejectedValue(new Error('unavailable'))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const enter = vi.fn(() => true)
    const {result} = renderHook(() => useStudioTourHint(enter, vi.fn()))
    await result.enter()
    expect(enter).toHaveBeenCalledOnce()
    expect(result.visible()).toBe(false)
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })
})
