/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readPluginRelease} from '../read-plugin-release'

afterEach(() => vi.unstubAllGlobals())
describe('readPluginRelease', () => {
  it('should read the exact package latest tag with a cancellation signal', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({name: '@winter-love/codex-code-viewer', version: '99.0.0'}))
    vi.stubGlobal('fetch', request)
    expect(await readPluginRelease()).toBe('99.0.0')
    expect(request).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@winter-love%2Fcodex-code-viewer/latest',
      expect.objectContaining({signal: expect.any(AbortSignal)}),
    )
  })
  it.each([
    Response.json({}, {status: 503}),
    Response.json({name: 'different', version: '99.0.0'}),
    Response.json({name: '@winter-love/codex-code-viewer', version: 'invalid'}),
  ])('should reject failed or invalid registry responses', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    await expect(readPluginRelease()).rejects.toThrow()
  })
})
