import {Show} from 'solid-js'

import {useObjectUrl} from 'src/hooks/use-object-url'

interface CustomAlbumCoverImageProps {
  readonly alt: string
  readonly class: string
  readonly coverImage: Blob
}

export const CustomAlbumCoverImage = (props: CustomAlbumCoverImageProps) => {
  const source = useObjectUrl(() => props.coverImage)

  return (
    <Show when={source()}>
      {(imageUrl) => <img alt={props.alt} class={props.class} src={imageUrl()} />}
    </Show>
  )
}
