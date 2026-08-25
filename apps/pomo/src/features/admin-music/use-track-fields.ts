import {createEffect, createSignal, on} from 'solid-js'

import {readTrackMetadata} from './track-metadata'

export interface UseTrackFieldsProps {
  readonly onArtistChange: (artist: string) => void
  readonly onTitleChange: (title: string) => void
  readonly resetVersion: number
}

export interface TrackFieldsController {
  readonly metadataMessage: () => string | null
  readonly onAudioFileChange: (file: File | undefined) => Promise<void>
  readonly onMetadataToggle: (shouldUseMetadata: boolean, file: File | undefined) => Promise<void>
  readonly useMetadata: () => boolean
}

export const useTrackFields = (props: UseTrackFieldsProps): TrackFieldsController => {
  const [metadataMessage, setMetadataMessage] = createSignal<string | null>(null)
  const [useMetadata, setUseMetadata] = createSignal(true)
  let readVersion = 0

  createEffect(
    on(
      () => props.resetVersion,
      () => {
        readVersion += 1
        setMetadataMessage(null)
        setUseMetadata(true)
      },
      {defer: true},
    ),
  )

  const applyMetadata = async (file: File): Promise<void> => {
    readVersion += 1
    const currentVersion = readVersion
    setMetadataMessage('MP3 정보를 읽는 중…')

    try {
      const metadata = await readTrackMetadata(file)

      if (currentVersion !== readVersion || !useMetadata()) {
        return
      }

      if (metadata.title !== null) {
        props.onTitleChange(metadata.title)
      }

      if (metadata.artist !== null) {
        props.onArtistChange(metadata.artist)
      }

      setMetadataMessage(
        metadata.title === null && metadata.artist === null
          ? 'MP3에 제목과 아티스트 정보가 없습니다.'
          : 'MP3의 제목과 아티스트를 적용했습니다.',
      )
    } catch {
      if (currentVersion === readVersion) {
        setMetadataMessage('MP3 정보를 읽지 못했습니다. 직접 입력해 주세요.')
      }
    }
  }

  const onAudioFileChange = async (file: File | undefined): Promise<void> => {
    if (file !== undefined && useMetadata()) {
      await applyMetadata(file)
    }
  }

  const onMetadataToggle = async (
    shouldUseMetadata: boolean,
    file: File | undefined,
  ): Promise<void> => {
    setUseMetadata(shouldUseMetadata)

    if (!shouldUseMetadata) {
      readVersion += 1
      setMetadataMessage(null)
      return
    }

    if (file !== undefined) {
      await applyMetadata(file)
    }
  }

  return {
    metadataMessage,
    onAudioFileChange,
    onMetadataToggle,
    useMetadata,
  }
}
