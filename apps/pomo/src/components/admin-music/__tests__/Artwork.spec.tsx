import type {AdminAlbum} from 'src/features/admin-music'
/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AlbumArtwork} from '../Artwork'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should replace a failed album cover with its fallback', () => {
  render(() => (
    <AlbumArtwork
      album={{
        coverFallback: 'music',
        coverImageUrl: '/cover.webp',
        id: 'album',
        release: {blockers: [], ready: true},
        status: 'draft',
        translations: [],
      }}
    />
  ))
  const image = screen.getByRole('img', {name: '제목 없는 앨범 커버'})
  expect(image).toHaveAttribute('src', '/cover.webp')
  fireEvent.error(image)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('music 기본 커버')).toHaveTextContent('♪')
})

it('should render the music glyph for a music fallback cover', () => {
  render(() => <AlbumArtwork album={{...ALBUM, coverFallback: 'music'}} />)

  expect(screen.getByLabelText('music 기본 커버')).toHaveTextContent('♪')
})

it('should render album artwork and replace it with the fallback after an image error', () => {
  render(() => <AlbumArtwork album={{...ALBUM, coverImageUrl: '/album-cover.jpg'}} />)
  const artwork = screen.getByRole('img', {name: '첫 앨범 앨범 커버'})

  expect(artwork).toHaveAttribute('src', '/album-cover.jpg')
  fireEvent.error(artwork)

  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('lp 기본 커버')).toHaveTextContent('LP')
})

it('should retry changed cover URLs after failures and after removing the cover', () => {
  const [album, setAlbum] = createSignal<AdminAlbum>({...ALBUM, coverImageUrl: '/broken.jpg'})
  render(() => <AlbumArtwork album={album()} />)

  fireEvent.error(screen.getByRole('img'))
  setAlbum((value) => ({...value, coverFallback: 'cd'}))
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('cd 기본 커버')).toHaveTextContent('CD')

  setAlbum((value) => ({...value, coverImageUrl: '/new.jpg'}))
  expect(screen.getByRole('img')).toHaveAttribute('src', '/new.jpg')
  expect(screen.queryByLabelText('cd 기본 커버')).not.toBeInTheDocument()

  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByLabelText('cd 기본 커버')).toHaveTextContent('CD')
  setAlbum((value) => ({...value, coverImageUrl: null}))
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  setAlbum((value) => ({...value, coverImageUrl: '/new.jpg'}))
  expect(screen.getByRole('img')).toHaveAttribute('src', '/new.jpg')
})

const ALBUM: AdminAlbum = {
  coverFallback: 'lp',
  coverImageUrl: null,
  id: 'album-id',
  release: {blockers: [], ready: true},
  status: 'draft',
  translations: [{albumId: 'album-id', description: '설명', locale: 'ko', title: '첫 앨범'}],
}
