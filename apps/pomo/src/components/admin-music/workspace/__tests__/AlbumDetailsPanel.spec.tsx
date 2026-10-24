/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createAlbum} from '../../__tests__/fixtures/model'
import {AlbumDetailsPanel} from '../AlbumDetailsPanel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show optional translations and their empty fallback', () => {
  const [album, setAlbum] = createSignal(createAlbum())
  render(() => <AlbumDetailsPanel album={album()} />)
  expect(screen.getByText('한국어 앨범')).toBeVisible()
  expect(screen.getByText('English album')).toBeInTheDocument()
  setAlbum(createAlbum('draft', []))
  expect(screen.getByText('등록된 선택 언어가 없습니다.')).toBeInTheDocument()
  expect(screen.queryByText('English album')).not.toBeInTheDocument()
})
