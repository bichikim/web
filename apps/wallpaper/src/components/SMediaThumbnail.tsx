import {Match, Show, Switch} from 'solid-js'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import {useMediaUrl} from '../features/settings/use-media-url'
import {SVideoPreview} from './SVideoPreview'

interface SMediaThumbnailProps {
  readonly item: BackgroundMedia
  readonly load: (id: string) => Promise<Blob>
}
export const SMediaThumbnail = (props: SMediaThumbnailProps) => {
  const media = useMediaUrl({id: () => props.item.id, load: (id) => props.load(id)})
  return (
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
            <img src={url()} alt="" class="h-full w-full object-cover" loading="lazy" />
          </Match>
          <Match when={props.item.kind === 'video'}>
            <SVideoPreview src={url()} />
          </Match>
        </Switch>
      )}
    </Show>
  )
}
