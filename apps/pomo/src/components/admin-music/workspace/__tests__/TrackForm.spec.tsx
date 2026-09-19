/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import type {TrackImportTask} from 'src/features/admin-music'
import {TrackForm} from '../TrackForm'
const metadata = vi.hoisted(() => ({readTrackMetadata: vi.fn()}))
vi.mock('src/features/admin-music/track-metadata', () => metadata)

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const setup = () => {
  const submitTrack = vi.fn().mockResolvedValue({status: 'created'})
  const onCancel = vi.fn()
  metadata.readTrackMetadata.mockImplementation(async (file: File) => ({
    artist: 'Artist',
    title: file.name,
  }))
  render(() => (
    <TrackForm
      albumId="album"
      albumTitle="앨범"
      isImporting={() => false}
      submitTrack={submitTrack}
      runTrackImport={async (task: TrackImportTask) => {
        await task()
      }}
      onCancel={onCancel}
    />
  ))
  return {onCancel, submitTrack}
}

it('should accept multiple selected files and submit their individual metadata', async () => {
  const {submitTrack} = setup()
  const files = [new File(['one'], 'one.mp3'), new File(['two'], 'two.mp3')]
  const input = screen.getByLabelText(/^MP3 파일 여러/u)
  expect(input).toHaveAttribute('multiple')
  fireEvent.change(input, {target: {files}})
  await waitFor(() => expect(screen.getByRole('button', {name: '2곡 추가'})).toBeEnabled())
  fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
  await waitFor(() => expect(submitTrack).toHaveBeenCalledTimes(2))
  expect(submitTrack.mock.calls.map(([form]) => form.get('title'))).toEqual(['one.mp3', 'two.mp3'])
  await waitFor(() => expect(screen.getAllByText('등록 완료')).toHaveLength(2))
})

it('should accept dropped files and use manual fields after metadata is unchecked', async () => {
  const {submitTrack} = setup()
  fireEvent.drop(screen.getByRole('group', {name: '파일 드롭 영역'}), {
    dataTransfer: {files: [new File(['one'], 'one.mp3'), new File(['two'], 'two.mp3')]},
  })
  await waitFor(() => expect(screen.getByRole('button', {name: '2곡 추가'})).toBeEnabled())
  const row = within(screen.getByRole('group', {name: 'one.mp3'}))
  fireEvent.click(row.getByRole('checkbox'))
  expect(row.getByRole('textbox', {name: '곡명'})).toBeEnabled()
  fireEvent.input(row.getByRole('textbox', {name: '곡명'}), {target: {value: '직접 입력'}})
  fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
  await waitFor(() => expect(submitTrack).toHaveBeenCalledTimes(2))
  expect(submitTrack.mock.calls[0][0].get('title')).toBe('직접 입력')
})

it('should allow removing files and closing before saving', async () => {
  const {onCancel} = setup()
  fireEvent.drop(screen.getByRole('group', {name: '파일 드롭 영역'}), {
    dataTransfer: {files: [new File(['one'], 'one.mp3')]},
  })
  await waitFor(() => expect(screen.getByRole('button', {name: '1곡 추가'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: 'one.mp3 목록에서 제외'}))
  expect(screen.queryByRole('group', {name: 'one.mp3'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(onCancel).toHaveBeenCalledOnce()
})

it('should allow removing a file when its registration result is uncertain', async () => {
  const {submitTrack} = setup()
  submitTrack.mockRejectedValueOnce(new Error('response lost'))
  fireEvent.drop(screen.getByRole('group', {name: '파일 드롭 영역'}), {
    dataTransfer: {files: [new File(['uncertain'], 'uncertain.mp3')]},
  })
  await waitFor(() => expect(screen.getByRole('button', {name: '1곡 추가'})).toBeEnabled())
  fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
  await screen.findByText('등록 결과를 확인하지 못했습니다. 목록에서 상태를 확인해 주세요.')
  const removeButton = screen.getByRole('button', {name: 'uncertain.mp3 목록에서 제외'})
  expect(removeButton).toBeEnabled()
  fireEvent.click(removeButton)
  expect(screen.queryByRole('group', {name: 'uncertain.mp3'})).toBeNull()
})
