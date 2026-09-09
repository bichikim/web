/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Content} from '../Content'

afterEach(() => vi.unstubAllGlobals())
it('should load a thumbnail, delete the selected item and revoke its URL on unmount', async () => {
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:thumbnail')
      static revokeObjectURL = vi.fn()
    },
  )
  const background = createBackground()
  const view = render(() => (
    <Content item={{id: 'photo', kind: 'photo', name: 'Beach', size: 5}} background={background} />
  ))
  await waitFor(() =>
    expect(view.container.querySelector('img')).toHaveAttribute('src', 'blob:thumbnail'),
  )
  expect(background.load).toHaveBeenCalledWith('photo')
  fireEvent.click(screen.getByRole('button', {name: 'Beach 삭제'}))
  expect(background.remove).toHaveBeenCalledWith('photo')
  fireEvent.error(view.container.querySelector('img')!)
  expect(screen.getByText('재생할 수 없는 파일이에요')).toBeInTheDocument()
  view.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail')
})
it('should show a load failure while leaving deletion available', async () => {
  const background = createBackground()
  vi.mocked(background.load).mockRejectedValue(new Error('missing'))
  render(() => (
    <Content item={{id: 'video', kind: 'video', name: 'Clip', size: 5}} background={background} />
  ))
  expect(await screen.findByText('재생할 수 없는 파일이에요')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Clip 삭제'})).toBeEnabled()
})
