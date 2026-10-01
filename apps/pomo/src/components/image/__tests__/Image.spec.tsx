/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {Image} from '../Image'

afterEach(() => vi.restoreAllMocks())

it('should keep the placeholder visible until the image loads, then show the image and overlay', () => {
  const {container} = render(() => (
    <Image src="/artwork.png" alt="Artwork" placeholder={<span>Loading</span>}>
      <span>Overlay</span>
    </Image>
  ))
  const image = container.querySelector('img')!
  expect(screen.getByText('Loading')).toBeInTheDocument()
  expect(screen.queryByRole('img', {name: 'Artwork'})).not.toBeInTheDocument()
  expect(screen.queryByText('Overlay')).not.toBeInTheDocument()
  expect(image.parentElement).toHaveAttribute('aria-busy', 'true')
  fireEvent.load(image)
  expect(screen.getByRole('img', {name: 'Artwork'})).toBeVisible()
  expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  expect(screen.getByText('Overlay')).toBeInTheDocument()
  expect(image.parentElement).toHaveAttribute('aria-busy', 'false')
})

it('should show the error fallback and keep the broken image and overlay hidden', () => {
  const {container} = render(() => (
    <Image
      src="/broken.png"
      alt="Artwork"
      placeholder={<span>Loading</span>}
      fallback={<span>Unavailable</span>}
    >
      <span>Overlay</span>
    </Image>
  ))
  fireEvent.error(container.querySelector('img')!)
  expect(screen.getByText('Unavailable')).toBeInTheDocument()
  expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  expect(screen.queryByRole('img', {name: 'Artwork'})).not.toBeInTheDocument()
  expect(screen.queryByText('Overlay')).not.toBeInTheDocument()
})

it('should reset when the URL changes and ignore late events from the previous image', () => {
  const [source, setSource] = createSignal('/first.png')
  const {container} = render(() => (
    <Image
      src={source()}
      alt="Artwork"
      placeholder={<span>Loading</span>}
      fallback={<span>Unavailable</span>}
    />
  ))
  const first = container.querySelector('img')!
  fireEvent.error(first)
  setSource('/second.png')
  const second = container.querySelector('img')!
  expect(second).not.toBe(first)
  expect(second).toHaveAttribute('src', '/second.png')
  fireEvent.load(first)
  fireEvent.error(first)
  expect(screen.getByText('Loading')).toBeInTheDocument()
  expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
  fireEvent.load(second)
  expect(screen.getByRole('img', {name: 'Artwork'})).toBeVisible()
  setSource('')
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText('Unavailable')).toBeInTheDocument()
})

it.each([
  {expected: 'loaded', naturalWidth: 640},
  {expected: 'error', naturalWidth: 0},
])(
  'should recognize a completed image as $expected without waiting for another event',
  ({naturalWidth, expected}) => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(naturalWidth)
    render(() => (
      <Image
        src="/cached.png"
        alt="Artwork"
        placeholder={<span>Loading</span>}
        fallback={<span>Unavailable</span>}
      />
    ))
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    if (expected === 'loaded') {
      expect(screen.getByRole('img', {name: 'Artwork'})).toBeVisible()
    } else {
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
    }
  },
)

it('should show alternative text when no URL or custom fallback is available', () => {
  const {container} = render(() => <Image alt="Artwork unavailable" />)
  expect(screen.getByText('Artwork unavailable')).toBeInTheDocument()
  expect(container.querySelector('img')).toBeNull()
})
