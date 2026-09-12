/** @vitest-environment jsdom */

import {MemoryRouter, revalidate} from '@solidjs/router'
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {adminCatalogQuery} from '../catalog-query'
import {useAdminMusic} from '../use-admin-music'

const catalog = {albums: [], assets: [], offers: [], pendingTracks: [], tracks: []}

const renderAdminMusic = () => {
  let model: ReturnType<typeof useAdminMusic> | undefined
  const MusicRoot = () => {
    model = useAdminMusic()
    return null
  }
  render(() => <MemoryRouter root={MusicRoot} />)
  if (model === undefined) {
    throw new Error('Music model was not mounted')
  }
  return model
}

beforeEach(async () => {
  await revalidate(adminCatalogQuery.key)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should preserve deletion success and retry through the actual router and catalog query', async () => {
  let catalogFails = false
  const fetcher = vi.fn<typeof fetch>(async (_input, options) => {
    if (options?.method === 'DELETE') {
      catalogFails = true
      return Response.json({success: true})
    }
    return catalogFails ? new Response(null, {status: 500}) : Response.json(catalog)
  })
  vi.stubGlobal('fetch', fetcher)
  const model = renderAdminMusic()
  await waitFor(() => expect(model.isLoading()).toBe(false))

  await model.handleTrackRemove('track-one')

  expect(model.catalogRefreshMessage()).toBe(
    '수록곡과 MP3 파일을 삭제했습니다. 목록을 새로고침하지 못했습니다.',
  )
  catalogFails = false
  await model.handleCatalogRetry()
  expect(model.catalogRefreshMessage()).toBeNull()
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1)
})

it('should retain a newer catalog refresh failure when an older retry settles', async () => {
  let catalogFails = false
  let retryResponse: Promise<Response> | null = null
  const fetcher = vi.fn<typeof fetch>(async (_input, options) => {
    if (options?.method === 'DELETE') {
      catalogFails = true
      return Response.json({success: true})
    }
    if (retryResponse !== null) {
      const response = retryResponse
      retryResponse = null
      return response
    }
    return catalogFails ? new Response(null, {status: 500}) : Response.json(catalog)
  })
  vi.stubGlobal('fetch', fetcher)
  const model = renderAdminMusic()
  await waitFor(() => expect(model.isLoading()).toBe(false))
  await model.handleTrackRemove('track-one')

  const deferred = Promise.withResolvers<Response>()
  retryResponse = deferred.promise
  const retry = model.handleCatalogRetry()
  await waitFor(() => expect(retryResponse).toBeNull())
  const catalogReads = fetcher.mock.calls.filter(
    ([, options]) => options?.method !== 'DELETE',
  ).length
  const removal = model.handleTrackRemove('track-two')
  await waitFor(() => {
    expect(
      fetcher.mock.calls.filter(([, options]) => options?.method !== 'DELETE').length,
    ).toBeGreaterThan(catalogReads)
  })
  deferred.resolve(Response.json(catalog))
  await Promise.all([retry, removal])

  expect(model.catalogRefreshMessage()).toBe(
    '수록곡과 MP3 파일을 삭제했습니다. 목록을 새로고침하지 못했습니다.',
  )
})
