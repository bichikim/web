import {createEffect, createSignal, onCleanup, Show} from 'solid-js'

import {replaceBlobObjectUrl} from '../../features/blob-object-url'

interface CustomAlbumCoverImageProps {
  readonly alt: string
  readonly class: string
  readonly coverImage: Blob
}

export const CustomAlbumCoverImage = (props: CustomAlbumCoverImageProps) => {
  const [source, setSource] = createSignal<string | null>(null)

  createEffect(() => {
    const image = props.coverImage
    const imageUrl = replaceBlobObjectUrl(null, () => image)
    setSource(imageUrl)

    if (imageUrl !== null) {
      onCleanup(() => replaceBlobObjectUrl(imageUrl, () => null))
    }
  })

  return (
    <Show when={source()}>
      {(imageUrl) => <img alt={props.alt} class={props.class} src={imageUrl()} />}
    </Show>
  )
}
