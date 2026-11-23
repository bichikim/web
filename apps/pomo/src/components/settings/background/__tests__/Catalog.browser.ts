import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {loadBackgroundSets} from 'src/features/background-sets'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Catalog} from '../Catalog'

vi.mock('src/features/background-sets', () => ({
  downloadBackgroundSet: vi.fn(),
  loadBackgroundSets: vi.fn(),
}))

afterEach(cleanup)

it('should replace the old failure with loading while the catalog retries', async () => {
  const retry = Promise.withResolvers<Awaited<ReturnType<typeof loadBackgroundSets>>>()
  vi.mocked(loadBackgroundSets)
    .mockRejectedValueOnce(new Error('network'))
    .mockReturnValueOnce(retry.promise)
  render(() => createComponent(Catalog, {background: createBackground(), onAdded: vi.fn()}))

  await expect.element(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', {name: m.background_retry()}).click()

  try {
    await expect.element(page.getByRole('status')).toBeVisible()
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument()
    await expect
      .element(page.getByRole('button', {name: m.background_retry()}))
      .not.toBeInTheDocument()
  } finally {
    retry.resolve([])
  }
  await expect.element(page.getByRole('status')).not.toBeInTheDocument()
})
