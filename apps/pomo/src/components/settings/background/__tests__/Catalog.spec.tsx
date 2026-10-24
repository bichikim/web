/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {Suspense} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {
  type BackgroundSet,
  downloadBackgroundSet,
  loadBackgroundSets,
} from 'src/features/background-sets'
import {Catalog} from '../Catalog'
vi.mock('src/features/background-sets', () => ({
  downloadBackgroundSet: vi.fn(),
  loadBackgroundSets: vi.fn(),
}))
const set: BackgroundSet = {
  id: 'photos',
  items: [
    {
      bytes: 1,
      id: 'one',
      name: 'one.png',
      sha256: 'a'.repeat(64),
      source: 'https://storage.pomofi.io/one.png',
    },
  ],
  kind: 'photo',
  title: {en: 'Yuna', ko: '유나 세트'},
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadBackgroundSets).mockResolvedValue([set])
})
it('should download and import a set before announcing completion, then abort on unmount', async () => {
  const files = [new File(['a'], 'one.png', {type: 'image/png'})]
  vi.mocked(downloadBackgroundSet).mockResolvedValue(files)
  const background = createBackground()
  const onAdded = vi.fn()
  const view = render(() => (
    <Suspense>
      <Catalog background={background} onAdded={onAdded} />
    </Suspense>
  ))
  fireEvent.click(await screen.findByRole('button', {name: '추가'}))
  await waitFor(() => expect(onAdded).toHaveBeenCalledOnce())
  expect(background.add).toHaveBeenCalledWith(files)
  const signal = vi.mocked(loadBackgroundSets).mock.calls[0]![0]
  view.unmount()
  expect(signal.aborted).toBe(true)
})
it('should show an import error and allow retry without closing the catalog', async () => {
  vi.mocked(downloadBackgroundSet).mockRejectedValue(new Error('network'))
  const onAdded = vi.fn()
  render(() => (
    <Suspense>
      <Catalog background={createBackground()} onAdded={onAdded} />
    </Suspense>
  ))
  fireEvent.click(await screen.findByRole('button', {name: '추가'}))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(onAdded).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '추가'})).toBeEnabled()
})
