/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {usePluginUpdates} from '../use-plugin-updates'
import type {ViewerPort} from '../types'

afterEach(cleanup)
const available = {current: '0.6.0', latest: '0.7.0', status: 'available', target: 'codex'}
describe('usePluginUpdates', () => {
  it('should expose a busy installation separately and allow checking again', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: available})
      .mockResolvedValueOnce({
        content: [],
        isError: true,
        structuredContent: {code: 'update-in-progress'},
      })
      .mockResolvedValueOnce({content: [], structuredContent: available})
    const {result} = renderHook(() => usePluginUpdates({call}))
    await result.check()
    await result.install()
    expect(result.failure()).toBe('busy')
    await result.check()
    expect(result.failure()).toBeNull()
  })
  it('should check then install the displayed version and retain the restart notice', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: available})
      .mockResolvedValueOnce({content: [], structuredContent: {...available, status: 'installed'}})
    const {result} = renderHook(() => usePluginUpdates({call}))
    expect(call).not.toHaveBeenCalled()
    await result.check()
    expect(result.release()).toEqual(available)
    await result.install()
    expect(call).toHaveBeenLastCalledWith(
      'code.update-install',
      {version: '0.7.0'},
      {timeout: 1_800_000},
    )
    expect(result.release()?.status).toBe('installed')
    await result.check()
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('should recover from check failure with a manual retry', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({content: [], structuredContent: available})
    const {result} = renderHook(() => usePluginUpdates({call}))
    await result.check()
    expect(result.failure()).toBe('check')
    await result.check()
    expect(result.failure()).toBeNull()
    expect(result.release()).toEqual(available)
  })
  it('should retain the version and allow retry after installation fails', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: available})
      .mockResolvedValueOnce({content: [], isError: true})
      .mockResolvedValueOnce({content: [], structuredContent: {...available, status: 'installed'}})
    const {result} = renderHook(() => usePluginUpdates({call}))
    await result.check()
    await result.install()
    expect(result.failure()).toBe('install')
    expect(result.release()).toEqual(available)
    await result.install()
    expect(result.release()?.status).toBe('installed')
  })
  it('should ignore duplicate actions while a check is pending', async () => {
    let finish: (value: Awaited<ReturnType<ViewerPort['call']>>) => void = () => {}
    const call = vi.fn<ViewerPort['call']>().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const {result} = renderHook(() => usePluginUpdates({call}))
    const checking = result.check()
    expect(result.pending()).toBe('check')
    await result.check()
    await result.install()
    expect(call).toHaveBeenCalledOnce()
    finish({content: [], structuredContent: available})
    await checking
    expect(result.pending()).toBeNull()
  })
  it('should reject invalid server results and never install a current release', async () => {
    const call = vi
      .fn<ViewerPort['call']>()
      .mockResolvedValueOnce({content: [], structuredContent: {latest: 'invalid'}})
      .mockResolvedValueOnce({content: [], structuredContent: {...available, status: 'current'}})
    const {result} = renderHook(() => usePluginUpdates({call}))
    await result.check()
    expect(result.failure()).toBe('check')
    await result.check()
    await result.install()
    expect(call).toHaveBeenCalledTimes(2)
  })
})
