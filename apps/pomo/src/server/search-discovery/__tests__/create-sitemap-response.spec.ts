/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {SEARCH_CONFIG} from 'src/features/search-discovery'
import {createSitemapResponse} from '../create-sitemap-response'
import {renderSitemap} from '../render-sitemap'

vi.mock('../render-sitemap', () => ({
  renderSitemap: vi.fn<typeof renderSitemap>(),
}))

afterEach(() => {
  vi.mocked(renderSitemap).mockReset()
})

const SITEMAP_URL = 'https://www.pomofi.io/sitemap.xml'

it('should skip XML rendering for HEAD even when rendering would fail', async () => {
  vi.mocked(renderSitemap).mockImplementation(() => {
    throw new Error('render failed')
  })

  const response = createSitemapResponse(new Request(SITEMAP_URL, {method: 'HEAD'}))

  expect(renderSitemap).not.toHaveBeenCalled()
  await expect(response.text()).resolves.toBe('')
})

it('should propagate the original rendering error with the configured input', () => {
  const failure = new Error('render failed')
  vi.mocked(renderSitemap).mockImplementation(() => {
    throw failure
  })
  let caught: unknown

  try {
    createSitemapResponse(new Request(SITEMAP_URL))
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
  expect(renderSitemap).toHaveBeenCalledOnce()
  expect(vi.mocked(renderSitemap).mock.calls[0]?.[0]).toBe(SEARCH_CONFIG)
})
