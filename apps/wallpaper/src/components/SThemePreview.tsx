import {createMemo, onCleanup, Show} from 'solid-js'
import type {ThemeArchive} from '@winter-love/wallpaper/theme'
import catalog from '../../builtin-assets.json'
import {text as uiText} from '../features/localization'
import {backgroundModeLabel} from '../features/themes/background-mode-label'

export const SThemePreview = (props: {readonly archive: ThemeArchive}) => {
  const cover = createMemo(() => {
    const {assets, background} = props.archive.manifest
    if (background?.mode !== 'album') {
      return undefined
    }
    const photo = background.mediaIds
      .map((id) => assets.find((asset) => asset.id === id))
      .find((asset) => asset?.kind === 'photo')
    if (photo?.source === 'builtin') {
      const file = catalog.media.find((item) => item.id === photo.builtinId)?.file
      return file === undefined ? undefined : `/builtin/${file}`
    }
    if (photo?.source === 'embedded') {
      const bytes = props.archive.assets[photo.id]
      if (bytes !== undefined) {
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: photo.type}))
        onCleanup(() => URL.revokeObjectURL(url))
        return url
      }
    }
    return undefined
  })
  const widgetNames = createMemo(() => {
    const {assets, widgets} = props.archive.manifest
    const names = widgets?.map(
      (widget) => assets.find((asset) => asset.id === widget.assetId)?.name,
    )
    return [...new Set(names)].filter(Boolean).join(', ')
  })
  return (
    <>
      <Show when={cover()} keyed>
        {(src) => (
          <div class="aspect-[16/7] overflow-hidden bg-violet-50">
            <img src={src} alt="" class="block h-full w-full object-cover" />
          </div>
        )}
      </Show>
      <div class="grid min-w-0 gap-3 px-5 pt-5">
        <h2 class="m-0 break-words text-2xl font-semibold text-violet-950">
          {props.archive.manifest.name}
        </h2>
        <dl class="m-0 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm text-violet-950">
          <Show when={props.archive.manifest.background}>
            {(background) => (
              <div class="flex gap-1.5">
                <dt>{uiText('배경')}</dt>
                <dd class="m-0 font-semibold">{backgroundModeLabel(background().mode)}</dd>
              </div>
            )}
          </Show>
          <Show when={props.archive.manifest.widgets}>
            {(widgets) => (
              <div class="flex min-w-0 flex-wrap gap-1.5">
                <dt>{uiText('위젯')}</dt>
                <dd class="m-0 font-semibold">{widgets().length}</dd>
                <Show when={widgetNames()}>
                  <dd class="m-0 break-all text-stone-600">{widgetNames()}</dd>
                </Show>
              </div>
            )}
          </Show>
        </dl>
      </div>
    </>
  )
}
