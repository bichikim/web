/** @vitest-environment jsdom */
import {App} from '@modelcontextprotocol/ext-apps'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createHost} from '../create-host'

describe('createHost file opening', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should omit file opening for standard hosts', () => {
    expect(createHost({integration: 'standard'}).openFile).toBeUndefined()
  })

  it('should delegate an absolute path to the host file API', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'openai/files': {}},
    })
    const request = vi.spyOn(App.prototype, 'request').mockResolvedValue({})
    const call = vi.spyOn(App.prototype, 'callServerTool')
    await createHost().openFile?.('/project/src/other file.ts')
    expect(request).toHaveBeenCalledWith(
      {method: 'openai/files/open', params: {path: '/project/src/other file.ts'}},
      expect.anything(),
    )
    expect(call).not.toHaveBeenCalled()
  })

  it('should reject when the connected host does not advertise file opening', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({})
    const request = vi.spyOn(App.prototype, 'request')
    await expect(createHost().openFile?.('/project/src/main.ts')).rejects.toThrow(
      '이 호스트에서는 파일을 새 탭에서 열 수 없습니다.',
    )
    expect(request).not.toHaveBeenCalled()
  })

  it('should propagate file API failures', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'openai/files': {}},
    })
    const error = new Error('host rejected the path')
    vi.spyOn(App.prototype, 'request').mockRejectedValue(error)
    await expect(createHost().openFile?.('/project/src/main.ts')).rejects.toBe(error)
  })

  it('should finish a pending file request before closing the connection', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'openai/files': {}},
    })
    const close = vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const pending = Promise.withResolvers<Record<string, never>>()
    const started = Promise.withResolvers<void>()
    vi.spyOn(App.prototype, 'request').mockImplementation(() => {
      started.resolve()
      return pending.promise
    })
    const host = createHost()
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    const opening = host.openFile?.('/project/src/main.ts')
    await started.promise
    const closing = stop()
    expect(close).not.toHaveBeenCalled()
    pending.resolve({})
    await Promise.all([opening, closing])
    expect(close).toHaveBeenCalledOnce()
  })
})
