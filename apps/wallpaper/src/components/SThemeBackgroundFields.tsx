import {For, Match, Show, Switch} from 'solid-js'
import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'
import {text as uiText} from '../features/localization'
import type {WallpaperController} from '../features/settings'

interface SThemeBackgroundFieldsProps {
  readonly content: WallpaperContent
  readonly controller: WallpaperController
  readonly onChange: (content: WallpaperContent) => void
}

export const SThemeBackgroundFields = (props: SThemeBackgroundFieldsProps) => {
  const album = () => (props.content.mode === 'album' ? props.content : undefined)
  const puppet = () => (props.content.mode === 'puppet' ? props.content : undefined)

  const changeMedia = (id: string, selected: boolean) => {
    const content = album()
    if (content !== undefined) {
      const mediaIds = selected
        ? [...content.mediaIds, id]
        : content.mediaIds.filter((item) => item !== id)
      props.onChange({...content, mediaIds})
    }
  }
  const changePuppet = (assetId: string) => {
    const content = puppet()
    const previous = props.controller.current()?.content
    if (content !== undefined) {
      props.onChange(
        previous?.mode === 'puppet' && previous.assetId === assetId
          ? previous
          : {assetId: assetId || null, mode: 'puppet'},
      )
    }
  }

  return (
    <Switch>
      <Match when={props.content.mode === 'website' && props.content.url === null}>
        <p class="m-0 text-sm text-stone-600">
          {uiText('배경 설정에서 웹사이트를 먼저 지정해 주세요.')}
        </p>
      </Match>
      <Match when={album()}>
        {(content) => (
          <fieldset class="m-0 min-w-0 border-0 p-0">
            <legend class="mb-1.5 p-0 text-xs font-medium text-stone-700">
              {uiText('앨범 파일')}
            </legend>
            <Show
              when={props.controller.items().length > 0}
              fallback={
                <p class="m-0 text-sm text-stone-600">
                  {uiText('앨범에 파일을 먼저 추가해 주세요.')}
                </p>
              }
            >
              <div class="grid max-h-32 gap-1 overflow-y-auto rounded-2 border border-solid border-stone-200 p-2">
                <For each={props.controller.items()}>
                  {(item) => (
                    <label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-stone-900">
                      <input
                        type="checkbox"
                        class="accent-violet-800"
                        checked={content().mediaIds.includes(item.id)}
                        onChange={(event) => changeMedia(item.id, event.currentTarget.checked)}
                      />
                      <span class="min-w-0 break-words">{item.name}</span>
                    </label>
                  )}
                </For>
              </div>
            </Show>
          </fieldset>
        )}
      </Match>
      <Match when={puppet()}>
        {(content) => (
          <label class="grid gap-1.5 text-xs font-medium text-stone-700">
            {uiText('Poffo 배경')}
            <select
              class="theme-field"
              value={content().assetId ?? ''}
              onChange={(event) => changePuppet(event.currentTarget.value)}
            >
              <option value="">{uiText('Poffo를 선택해 주세요.')}</option>
              <For each={props.controller.puppets()}>
                {(asset) => <option value={asset.id}>{asset.name}</option>}
              </For>
            </select>
          </label>
        )}
      </Match>
    </Switch>
  )
}
