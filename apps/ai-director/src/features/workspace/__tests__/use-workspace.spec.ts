/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useWorkspace} from '../use-workspace'

const original = {height: 16, url: 'data:image/png;base64,original', width: 24}
const result = {height: 64, url: 'data:image/png;base64,result', width: 96}
const disposers: Array<() => void> = []
const setup = () =>
  createRoot((dispose) => {
    disposers.push(dispose)
    return useWorkspace()
  })
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  delete globalThis.__TAURI__
})

describe('useWorkspace', () => {
  it('should default to Lanczos and execute SPAN-F only after selection and explicit execution', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(result)
    globalThis.__TAURI__ = {core: {invoke}}
    const workspace = setup()
    expect(workspace.method()).toBe('lanczos')
    await workspace.open(false)
    await workspace.upscale()
    expect(invoke).toHaveBeenNthCalledWith(2, 'upscale_image', {method: 'lanczos'})
    workspace.setMethod('spanf')
    expect(invoke).toHaveBeenCalledTimes(2)
    expect(workspace.resultMethod()).toBe('lanczos')
    await workspace.upscale()
    expect(invoke).toHaveBeenNthCalledWith(3, 'upscale_image', {method: 'spanf'})
    expect(workspace.original()).toEqual(original)
    expect(workspace.resultMethod()).toBe('spanf')
  })

  it('should retain an existing result after cancellation and release busy state', async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(null)
    globalThis.__TAURI__ = {core: {invoke}}
    const workspace = setup()
    await workspace.open(false)
    await workspace.upscale()
    await workspace.upscale()
    expect(workspace.result()).toEqual(result)
    expect(workspace.error()).toBeNull()
    expect(workspace.busy()).toBe(false)
    expect(workspace.processing()).toBe(false)
  })

  it.each([true, false])(
    'should apply a pending result only if the native cancel is too late (%s)',
    async (cancelled) => {
      const upscale = Promise.withResolvers<typeof result>()
      const cancel = Promise.withResolvers<boolean>()
      const invoke = vi
        .fn()
        .mockResolvedValueOnce(original)
        .mockReturnValueOnce(upscale.promise)
        .mockReturnValueOnce(cancel.promise)
      globalThis.__TAURI__ = {core: {invoke}}
      const workspace = setup()
      await workspace.open(false)
      const processing = workspace.upscale()
      const cancelling = workspace.cancel()
      upscale.resolve(result)
      await Promise.resolve()
      expect(workspace.result()).toBeNull()

      cancel.resolve(cancelled)
      await Promise.all([processing, cancelling])

      expect(workspace.result()).toEqual(cancelled ? null : result)
      expect(workspace.busy()).toBe(false)
    },
  )

  it('should recover from native errors without replacing the original', async () => {
    const invoke = vi.fn().mockResolvedValueOnce(original).mockRejectedValueOnce('upscale_failed')
    globalThis.__TAURI__ = {core: {invoke}}
    const workspace = setup()
    await workspace.open(false)
    await workspace.upscale()
    expect(workspace.original()).toEqual(original)
    expect(workspace.result()).toBeNull()
    expect(workspace.error()).not.toBeNull()
    expect(workspace.busy()).toBe(false)
  })

  it('should tell the user to open or capture an image when the native operation has no input', async () => {
    globalThis.__TAURI__ = {core: {invoke: vi.fn().mockRejectedValueOnce('no_image')}}
    const workspace = setup()

    await workspace.upscale()

    expect(workspace.error()).toBe('이미지를 먼저 열거나 화면을 캡처해 주세요.')
  })
})
