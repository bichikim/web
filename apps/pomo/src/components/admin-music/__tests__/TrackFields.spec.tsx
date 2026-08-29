/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

const metadataMocks = vi.hoisted(() => ({readTrackMetadata: vi.fn()}))

vi.mock('../../../features/admin-music/track-metadata', () => metadataMocks)

import TrackFields from '../TrackFields'

const renderFields = () => {
  const [artist, setArtist] = createSignal('직접 입력한 아티스트')
  const [title, setTitle] = createSignal('직접 입력한 제목')
  render(() => (
    <form aria-label="곡 폼">
      <TrackFields
        artist={artist()}
        onArtistChange={setArtist}
        onTitleChange={setTitle}
        resetVersion={0}
        title={title()}
      />
    </form>
  ))
}

const getInput = (label: string | RegExp): HTMLInputElement =>
  screen.getByLabelText(label) as HTMLInputElement

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TrackFields', () => {
  it('should update manually entered title and artist values', () => {
    renderFields()
    fireEvent.click(screen.getByLabelText('MP3 정보로 제목·아티스트 채우기'))

    fireEvent.input(getInput('곡명'), {target: {value: '새 제목'}})
    fireEvent.input(getInput('아티스트'), {target: {value: '새 아티스트'}})

    expect(getInput('곡명').value).toBe('새 제목')
    expect(getInput('아티스트').value).toBe('새 아티스트')
  })

  it('should fill the title and artist from selected MP3 metadata by default', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: '태그 제목'})
    renderFields()
    const file = new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'})

    fireEvent.change(screen.getByLabelText(/^MP3 파일/u), {target: {files: [file]}})

    await waitFor(() => {
      expect(getInput('곡명').value).toBe('태그 제목')
      expect(getInput('아티스트').value).toBe('태그 아티스트')
    })
    expect(getInput('곡명').disabled).toBe(true)
    expect(getInput('아티스트').disabled).toBe(true)
    const form = new FormData(screen.getByRole('form', {name: '곡 폼'}) as HTMLFormElement)
    expect(form.get('title')).toBe('태그 제목')
    expect(form.get('artist')).toBe('태그 아티스트')
    expect(screen.getByText('MP3의 제목과 아티스트를 적용했습니다.')).toBeTruthy()
  })

  it('should preserve manual values when metadata use is unchecked', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: '태그 제목'})
    renderFields()
    const metadataCheckbox = screen.getByLabelText('MP3 정보로 제목·아티스트 채우기')

    expect((metadataCheckbox as HTMLInputElement).checked).toBe(true)
    fireEvent.click(metadataCheckbox)
    expect(getInput('곡명').disabled).toBe(false)
    expect(getInput('아티스트').disabled).toBe(false)
    fireEvent.change(screen.getByLabelText(/^MP3 파일/u), {
      target: {files: [new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'})]},
    })

    expect(getInput('곡명').value).toBe('직접 입력한 제목')
    expect(getInput('아티스트').value).toBe('직접 입력한 아티스트')
    expect(metadataMocks.readTrackMetadata).not.toHaveBeenCalled()
  })

  it('should preserve applied metadata when metadata use is unchecked', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: '태그 제목'})
    renderFields()

    fireEvent.change(screen.getByLabelText(/^MP3 파일/u), {
      target: {files: [new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'})]},
    })
    await waitFor(() => expect(getInput('곡명').value).toBe('태그 제목'))
    fireEvent.click(screen.getByLabelText('MP3 정보로 제목·아티스트 채우기'))

    expect(getInput('곡명').value).toBe('태그 제목')
    expect(getInput('아티스트').value).toBe('태그 아티스트')
  })
})
