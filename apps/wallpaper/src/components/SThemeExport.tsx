import {createMemo, createSignal, For, type JSX, Show} from 'solid-js'
import {THEME_NAME_LIMIT} from '@winter-love/wallpaper/theme'
import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'
import {createWallpaperContent} from '@winter-love/wallpaper/settings/create-wallpaper-content'
import type {WallpaperLibraryController} from '../features/library'
import {text as uiText} from '../features/localization'
import type {WallpaperController} from '../features/settings'
import type {ThemesController} from '../features/themes'
import {backgroundModeLabel} from '../features/themes/background-mode-label'
import {findThemeWidgetMonitor} from '../features/themes/placement'
import {SThemeBackgroundFields} from './SThemeBackgroundFields'
import {SThemeWidgetChoices} from './SThemeWidgetChoices'

type BackgroundMode = WallpaperContent['mode']
const MODES = ['website', 'album', 'puppet'] as const

interface SThemeExportProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
  readonly monitorId: string
  readonly themes: ThemesController
}

const backgroundReady = (content: WallpaperContent) => {
  switch (content.mode) {
    case 'website':
      return content.url !== null
    case 'album':
      return content.mediaIds.length > 0
    case 'puppet':
      return content.assetId !== null
  }
}

export const SThemeExport = (props: SThemeExportProps) => {
  const [name, setName] = createSignal('')
  const [withBackground, setWithBackground] = createSignal(true)
  const [excluded, setExcluded] = createSignal<readonly string[]>([])
  const [choice, setChoice] = createSignal<BackgroundMode | null>(null)
  const [drafts, setDrafts] = createSignal<Partial<Record<BackgroundMode, WallpaperContent>>>({})
  const currentBackground = () => props.controller.current()?.content
  const mode = () => choice() ?? currentBackground()?.mode ?? 'album'
  const background = createMemo(() => {
    const selected = mode()
    const draft = drafts()[selected]
    const current = currentBackground()
    if (draft !== undefined) {
      return draft
    }
    if (current?.mode === selected) {
      return current
    }
    return selected === 'website'
      ? {mode: selected, url: props.library.lastWebsite(props.monitorId)}
      : createWallpaperContent(selected)
  })
  const widgetOptions = createMemo(() => {
    const monitors = props.controller.monitors()
    const assets = props.controller.puppets()
    return props.library.widgets().flatMap((widget, index) => {
      if (findThemeWidgetMonitor(widget, monitors)?.id !== props.monitorId) {
        return []
      }
      const name = assets.find((asset) => asset.id === widget.assetId)?.name ?? uiText('Poffo 위젯')
      return [
        {
          id: widget.id,
          label: uiText('{value0} · 위젯 {value1}', {value0: name, value1: String(index + 1)}),
        },
      ]
    })
  })
  const widgetIds = createMemo(() => {
    const omitted = excluded()
    return widgetOptions()
      .filter((option) => !omitted.includes(option.id))
      .map((option) => option.id)
  })
  const selectWidgets = (ids: readonly string[]) =>
    setExcluded(
      widgetOptions()
        .filter((option) => !ids.includes(option.id))
        .map((option) => option.id),
    )
  const canSave = () =>
    !props.themes.busy() &&
    props.library.ready() &&
    name().trim() !== '' &&
    (withBackground() ? backgroundReady(background()) : widgetIds().length > 0)

  const changeMode = (value: string) => {
    const mode = MODES.find((option) => option === value)
    if (mode !== undefined) {
      setChoice(mode)
    }
  }
  const changeBackground = (content: WallpaperContent) =>
    setDrafts((previous) => ({...previous, [content.mode]: content}))
  const handleSave: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault()
    if (canSave()) {
      props.themes.save({
        background: withBackground() ? background() : undefined,
        name: name().trim(),
        widgetIds: widgetIds(),
      })
    }
  }

  return (
    <form class="grid gap-4" onSubmit={handleSave}>
      <fieldset class="m-0 grid min-w-0 gap-3 border-0 p-0" disabled={props.themes.busy()}>
        <legend class="mb-1.5 p-0 text-xs font-medium text-stone-700">
          {uiText('포함할 항목')}
        </legend>
        <label class="flex items-center gap-2 text-sm text-stone-900">
          <input
            type="checkbox"
            class="accent-violet-800"
            checked={withBackground()}
            onChange={(event) => setWithBackground(event.currentTarget.checked)}
          />
          {uiText('배경')}
        </label>
        <Show when={withBackground()}>
          <label class="grid gap-1.5 text-xs font-medium text-stone-700">
            {uiText('배경 종류')}
            <select
              class="theme-field"
              value={mode()}
              onChange={(event) => changeMode(event.currentTarget.value)}
            >
              <For each={MODES}>
                {(option) => <option value={option}>{backgroundModeLabel(option)}</option>}
              </For>
            </select>
          </label>
          <SThemeBackgroundFields
            content={background()}
            controller={props.controller}
            onChange={changeBackground}
          />
        </Show>
        <SThemeWidgetChoices
          options={widgetOptions()}
          selected={widgetIds()}
          onChange={selectWidgets}
        />
      </fieldset>
      <div class="flex flex-wrap items-end gap-2">
        <label class="grid min-w-35 flex-1 gap-1.5 text-xs font-medium text-stone-700">
          {uiText('테마 이름')}
          <input
            class="theme-field"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
            maxlength={THEME_NAME_LIMIT}
            disabled={props.themes.busy()}
            required
          />
        </label>
        <button class="theme-secondary" type="submit" disabled={!canSave()}>
          {uiText('테마 내보내기')}
        </button>
      </div>
    </form>
  )
}
