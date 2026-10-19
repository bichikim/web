import {type Accessor, createSignal} from 'solid-js'
import type {AlbumWallpaper} from '@winter-love/wallpaper/settings/model'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import {useAlbum} from '../features/background/use-album'

interface SAlbumBackgroundProps {
  readonly content: Accessor<AlbumWallpaper>
  readonly items: Accessor<readonly BackgroundMedia[]>
  readonly load: (id: string) => Promise<Blob>
  readonly onError: (error: unknown) => void
}

export const SAlbumBackground = (props: SAlbumBackgroundProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const album = useAlbum({
    canvas,
    content: () => props.content(),
    items: () => props.items(),
    load: (id) => props.load(id),
    onError: (error) => props.onError(error),
  })
  return (
    <canvas
      ref={setCanvas}
      class="block h-full w-full"
      aria-label={album.current()?.name ?? '앨범 배경'}
    />
  )
}
