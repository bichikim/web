/** @vitest-environment jsdom */

import {cleanup, fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {catalogWithAlbum, coverImageMocks, renderAdminMusic} from './fixtures/admin-music'

describe('AdminMusic', () => {
  it('should provide an album cover file upload with its accepted formats', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []}),
        ),
    )
    renderAdminMusic()

    const coverInput = await screen.findByLabelText(/^이미지 파일/u)

    expect(coverInput.getAttribute('type')).toBe('file')
    expect(coverInput.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
    expect(screen.getByText(/중앙 정사각형 크롭 · 1200×1200 WebP/u)).toBeTruthy()
  })

  it('should render a prepared cover preview', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stored-cover')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []}),
        ),
    )
    renderAdminMusic()
    const coverInput = await screen.findByLabelText(/^이미지 파일/u)
    const cover = new File(['cover'], 'cover.png', {type: 'image/png'})
    Object.defineProperty(coverInput, 'files', {value: {item: () => cover}})
    fireEvent.change(coverInput)

    const preview = await screen.findByRole('img', {name: '업로드할 앨범 커버 미리보기'})
    expect(preview.getAttribute('src')).toBe('blob:stored-cover')
    expect(screen.getByText('업로드될 최종 이미지입니다.')).toBeTruthy()
  })

  it('should wire cover fields and show the processing state while conversion is pending', async () => {
    let resolveCover: (file: File) => void = () => undefined
    const coverPreparation = new Promise<File>((resolve) => {
      resolveCover = resolve
    })
    coverImageMocks.prepareAlbumCover.mockReturnValue(coverPreparation)
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []}),
        ),
    )
    renderAdminMusic()
    const coverInput = await screen.findByLabelText(/^이미지 파일/u)
    const urlInput = screen.getByLabelText('외부 HTTPS 주소')
    const fallbackSelect = screen.getByLabelText('이미지가 없을 때')

    fireEvent.input(urlInput, {target: {value: 'https://example.com/cover.jpg'}})
    fireEvent.change(fallbackSelect, {target: {value: 'cd'}})
    expect((urlInput as HTMLInputElement).value).toBe('https://example.com/cover.jpg')
    expect((fallbackSelect as HTMLSelectElement).value).toBe('cd')

    const file = new File(['cover'], 'cover.png', {type: 'image/png'})
    Object.defineProperty(coverInput, 'files', {value: {item: () => file}})
    fireEvent.change(coverInput)
    expect(await screen.findByRole('button', {name: '커버 이미지 처리 중…'})).toBeDisabled()

    cleanup()
    resolveCover(new File(['prepared'], 'cover.webp', {type: 'image/webp'}))
    await coverPreparation
  })
})
