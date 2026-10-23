/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {createEmptyAlbumTranslations} from 'src/features/admin-music'
import {afterEach, expect, it, vi} from 'vitest'
import {AlbumDraftForm} from '../AlbumDraftForm'
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn(() => () => null)}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show cover previews and block submission while processing the cover', () => {
  const [processing, setProcessing] = createSignal(false)
  const handleAlbumSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
  const draftModel = {
    albumTranslations: createEmptyAlbumTranslations,
    coverFallback: () => 'lp' as const,
    coverImageUrl: () => '',
    coverPreviewUrl: () => '/preview.webp',
    handleAlbumSubmit,
    handleCoverChange: vi.fn(),
    handleCoverFallbackChange: vi.fn(),
    handleCoverImageUrlInput: vi.fn(),
    handleTranslationsChange: vi.fn(),
    isProcessingCover: processing,
    isRestoringDraft: () => false,
    isSavingAlbum: () => false,
  }
  const view = render(() => <AlbumDraftForm model={draftModel} />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/preview.webp')
  expect(view.container.querySelector('input[type=file]')).toHaveAttribute(
    'accept',
    'image/jpeg,image/jpg,.jpg,.jpeg,image/png,image/webp',
  )
  fireEvent.submit(view.container.querySelector('form')!)
  expect(handleAlbumSubmit).toHaveBeenCalledOnce()
  setProcessing(true)
  expect(screen.getByRole('button', {name: '커버 이미지 처리 중…'})).toBeDisabled()
})

it('should pass the selected file to an asynchronous cover handler and follow its state', async () => {
  const completion = Promise.withResolvers<void>()
  const [processing, setProcessing] = createSignal(false)
  const [preview, setPreview] = createSignal<string | null>(null)
  let selectedInput: HTMLInputElement | null = null
  let selectedFile: File | null = null
  const handleCoverChange = vi.fn<JSX.EventHandler<HTMLInputElement, Event>>(async (event) => {
    selectedInput = event.currentTarget
    selectedFile = selectedInput.files?.item(0) ?? null
    setProcessing(true)
    await completion.promise
    setPreview('/prepared.webp')
    setProcessing(false)
  })
  render(() => (
    <AlbumDraftForm
      model={{
        albumTranslations: createEmptyAlbumTranslations,
        coverFallback: () => 'lp',
        coverImageUrl: () => '',
        coverPreviewUrl: preview,
        handleAlbumSubmit: vi.fn(),
        handleCoverChange,
        handleCoverFallbackChange: vi.fn(),
        handleCoverImageUrlInput: vi.fn(),
        handleTranslationsChange: vi.fn(),
        isProcessingCover: processing,
        isRestoringDraft: () => false,
        isSavingAlbum: () => false,
      }}
    />
  ))
  const input = screen.getByLabelText<HTMLInputElement>(/이미지 파일/)
  const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})
  const files: FileList = Object.assign([file], {
    item: (index: number) => (index === 0 ? file : null),
  })

  try {
    fireEvent.change(input, {target: {files}})
    expect(handleCoverChange).toHaveBeenCalledOnce()
    expect(selectedInput).toBe(input)
    expect(selectedFile).toBe(file)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: '커버 이미지 처리 중…'})).toBeDisabled()
  } finally {
    completion.resolve()
  }

  await waitFor(() =>
    expect(screen.getByRole('img', {name: '업로드할 앨범 커버 미리보기'})).toHaveAttribute(
      'src',
      '/prepared.webp',
    ),
  )
  expect(screen.getByRole('button', {name: '앨범 초안 만들기'})).toBeEnabled()
})
