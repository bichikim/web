/** @vitest-environment jsdom */
import {MemoryRouter} from '@solidjs/router'
import {renderHook} from '@solidjs/testing-library'
import {createComponent, type ParentProps} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useTrackImport} from '../use-track-import'
import {useTrackManagement} from '../use-track-management'

const RouterWrapper = (props: ParentProps) =>
  createComponent(MemoryRouter, {root: () => props.children})
afterEach(() => vi.unstubAllGlobals())

describe('track import through the real action and HTTP client', () => {
  it.each(['lost response', 'server error', 'malformed response'] as const)(
    'should not repeat an ambiguous track creation after %s',
    async (failure) => {
      const fetcher = vi.fn<typeof fetch>(async () => {
        switch (failure) {
          case 'lost response':
            throw new TypeError('Response lost after record creation')
          case 'server error':
            return new Response(null, {status: 503})
          case 'malformed response':
            return Response.json({})
        }
      })
      vi.stubGlobal('fetch', fetcher)
      const {result, cleanup} = renderHook(
        () => {
          const management = useTrackManagement({
            refreshCatalog: async () => undefined,
            setMessage: () => undefined,
          })
          return useTrackImport({
            albumId: () => '11111111-1111-4111-8111-111111111111',
            createTrack: management.submitTrack,
          })
        },
        {wrapper: RouterWrapper},
      )
      result.addFiles([new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'})])
      const {id} = result.tracks[0]
      result.updateTrack(id, 'title', 'Track')
      result.updateTrack(id, 'artist', 'Artist')
      await result.submit()
      await result.submit()
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result.tracks[0].status).toBe('preserved')
      cleanup()
    },
  )
})
