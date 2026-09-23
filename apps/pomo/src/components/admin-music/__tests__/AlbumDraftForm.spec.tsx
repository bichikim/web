/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {createEmptyAlbumTranslations} from 'src/features/admin-music'
import {afterEach, expect, it, vi} from 'vitest'
import {AlbumDraftForm} from '../AlbumDraftForm'
import {createModelHarness} from './fixtures/model'
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn(() => () => null)}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show cover previews and block submission while processing the cover', () => {
  const {model} = createModelHarness()
  const [processing, setProcessing] = createSignal(false)
  const handleAlbumSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
  const draftModel = {
    ...model,
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
    'image/jpeg,image/png,image/webp',
  )
  fireEvent.submit(view.container.querySelector('form')!)
  expect(handleAlbumSubmit).toHaveBeenCalledOnce()
  setProcessing(true)
  expect(screen.getByRole('button', {name: '커버 이미지 처리 중…'})).toBeDisabled()
})
