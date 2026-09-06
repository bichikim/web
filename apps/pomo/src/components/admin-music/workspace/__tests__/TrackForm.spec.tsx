/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createModelHarness} from '../../__tests__/fixtures/model'
import {TrackForm} from '../TrackForm'
vi.mock('../../TrackFields', () => ({TrackFields: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should submit the album track, allow cancellation, and disable saving twice', () => {
  const {model, setSavingTrack} = createModelHarness()
  const onCancel = vi.fn()
  const view = render(() => (
    <TrackForm albumId="album" albumTitle="앨범" model={model} onCancel={onCancel} />
  ))
  expect(view.container.querySelector('input[name=albumId]')).toHaveValue('album')
  fireEvent.submit(view.container.querySelector('form')!)
  expect(model.handleTrackSubmit).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(onCancel).toHaveBeenCalledOnce()
  setSavingTrack(true)
  expect(screen.getByRole('button', {name: '곡 저장·MP3 검증 중…'})).toBeDisabled()
})
