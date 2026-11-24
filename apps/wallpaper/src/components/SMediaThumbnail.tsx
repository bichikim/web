import {createSignal, Match, onCleanup, onMount, Show, Switch} from 'solid-js'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import {useMediaUrl} from '../features/settings/use-media-url'
import {SVideoPreview} from './SVideoPreview'

interface SMediaThumbnailProps {
  readonly item: BackgroundMedia
  readonly load: (id: string) => Promise<Blob>
}

// Allow for a 3x display at the thumbnail's normal size.
const PHOTO_WIDTH = 256

const resizePhoto = async (photo: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(photo, {resizeQuality: 'high', resizeWidth: PHOTO_WIDTH})
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (context === null) {
      return photo
    }
    context.drawImage(bitmap, 0, 0)
    return await canvas.convertToBlob()
  } finally {
    bitmap.close()
  }
}

export const SMediaThumbnail = (props: SMediaThumbnailProps) => {
  const [visible, setVisible] = createSignal(false)
  const [element, setElement] = createSignal<HTMLSpanElement>()
  const media = useMediaUrl({
    id: () => (visible() ? props.item.id : null),
    load: async (id) => {
      const photo = props.item.kind === 'photo'
      const source = await props.load(id)
      return photo ? resizePhoto(source).catch(() => source) : source
    },
  })
  onMount(() => {
    const target = element()
    if (typeof IntersectionObserver === 'undefined' || target === undefined) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting === true),
    )
    observer.observe(target)
    onCleanup(() => observer.disconnect())
  })
  return (
    <span ref={setElement} class="relative grid h-full w-full place-items-center overflow-hidden">
      <Show
        when={media.url()}
        fallback={
          <span aria-hidden="true" class="text-stone-500">
            ◇
          </span>
        }
      >
        {(url) => (
          <Switch>
            <Match when={props.item.kind === 'photo'}>
              <img src={url()} alt="" class="absolute inset-0 h-full w-full object-cover" />
            </Match>
            <Match when={props.item.kind === 'video'}>
              <SVideoPreview src={url()} />
            </Match>
          </Switch>
        )}
      </Show>
    </span>
  )
}
