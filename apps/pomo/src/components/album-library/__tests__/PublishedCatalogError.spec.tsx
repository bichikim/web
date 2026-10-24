/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {reportClientError} from 'src/features/client-error-reporter'
import {afterEach, expect, it, vi} from 'vitest'
import {PublishedCatalogError} from '../PublishedCatalogError'
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should report the catalog error and disable retry while a retry is pending', () => {
  const error = new Error('catalog failed')
  const onRetry = vi.fn()
  const [retrying, setRetrying] = createSignal(false)
  render(() => <PublishedCatalogError error={error} isRetrying={retrying()} onRetry={onRetry} />)
  expect(reportClientError).toHaveBeenCalledWith(error, {
    feature: 'album-library',
    source: 'direct',
  })
  expect(screen.getByRole('alert')).toHaveTextContent(m.album_catalog_load_failed())
  fireEvent.click(screen.getByRole('button'))
  expect(onRetry).toHaveBeenCalledOnce()
  setRetrying(true)
  expect(screen.getByRole('button')).toBeDisabled()
})
