import {For, type JSX, Match, Show, Switch} from 'solid-js'
import type {ThemeArchive} from '@winter-love/wallpaper/theme'
import type {WallpaperController} from '../features/settings'
import type {ThemesController} from '../features/themes'
import {localizeMessage, text as uiText} from '../features/localization'
import {SThemePreview} from './SThemePreview'
import {SThemeExport} from './SThemeExport'
import {HSettingsScope} from './HSettingsScope'
import {SSettingsLinks} from './SSettingsLinks'
import type {WallpaperLibraryController} from '../features/library'

interface ThemeSettingsProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
  readonly themes: ThemesController
}

const SThemeScreen = (props: Omit<ThemeSettingsProps, 'library'>) => (
  <label class="grid min-w-0 gap-1.5 text-xs font-medium text-stone-700">
    {uiText('대상 화면')}
    <select
      class="theme-field"
      value={props.controller.selectedId() ?? ''}
      disabled={props.themes.busy()}
      onChange={(event) => props.controller.selectMonitor(event.currentTarget.value)}
    >
      <For each={props.controller.monitors()}>
        {(monitor) => <option value={monitor.id}>{monitor.name}</option>}
      </For>
    </select>
  </label>
)

interface SThemeImportProps extends Omit<ThemeSettingsProps, 'library'> {
  readonly archive: ThemeArchive
}

const SThemeImport = (props: SThemeImportProps) => {
  const hasOverrides = () => {
    const background = props.archive.manifest.background
    return (
      background?.mode === 'website' &&
      (background.css ?? background.script ?? background.scriptStart ?? background.scriptDom) !==
        undefined
    )
  }

  return (
    <article class="overflow-hidden rounded-5 border border-solid border-violet-100 bg-white">
      <SThemePreview archive={props.archive} />
      <div class="grid gap-4 px-5 pb-5 pt-3">
        <p class="m-0 text-sm text-stone-600">
          {uiText('테마에 포함된 항목을 선택한 화면에 적용합니다.')}
        </p>
        <Show when={hasOverrides()}>
          <p class="m-0 text-sm text-stone-600">
            {uiText('이 테마의 웹 배경은 주소만 적용합니다.')}
          </p>
        </Show>
        <div class="flex flex-wrap items-end gap-2">
          <div class="min-w-30 flex-1">
            <SThemeScreen controller={props.controller} themes={props.themes} />
          </div>
          <button
            class="theme-secondary"
            type="button"
            disabled={props.themes.busy()}
            onClick={() => props.themes.cancel()}
          >
            {uiText('취소')}
          </button>
          <button
            class="theme-primary"
            type="button"
            disabled={props.controller.monitors().length === 0 || props.themes.busy()}
            onClick={() => props.themes.apply()}
          >
            {uiText('테마 적용')}
          </button>
        </div>
      </div>
    </article>
  )
}

const SThemeImportActions = (props: {readonly themes: ThemesController}) => {
  const handleFile: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    const file = event.currentTarget.files?.item(0)
    if (file) {
      props.themes.openFile(file)
    }
    event.currentTarget.value = ''
  }
  return (
    <section class="grid gap-4 rounded-5 bg-violet-50 p-5">
      <h2 class="m-0 text-2xl font-semibold text-violet-950">Poffo Themes</h2>
      <div class="flex flex-wrap gap-2">
        <button class="theme-primary" type="button" onClick={() => props.themes.openMarket()}>
          {uiText('Poffo Themes 열기')}
        </button>
        <label class="theme-secondary focus-within:outline">
          {uiText('테마 파일 가져오기')}
          <input
            class="sr-only"
            type="file"
            accept=".poffotheme"
            disabled={props.themes.busy()}
            onChange={handleFile}
          />
        </label>
      </div>
    </section>
  )
}

const SThemeExportPage = (props: ThemeSettingsProps) => (
  <section class="grid gap-3 rounded-5 border border-solid border-stone-200 p-5">
    <h2 class="m-0 text-base font-semibold">{uiText('현재 화면을 테마로 저장')}</h2>
    <SThemeScreen controller={props.controller} themes={props.themes} />
    <Show when={props.controller.selectedId()} keyed>
      {(monitorId) => (
        <SThemeExport
          controller={props.controller}
          library={props.library}
          monitorId={monitorId}
          themes={props.themes}
        />
      )}
    </Show>
  </section>
)

export type ThemePage = 'overview' | 'import' | 'export'

interface SThemeSettingsProps extends ThemeSettingsProps {
  readonly page: ThemePage
  readonly onPageChange: (page: ThemePage) => void
}

const PAGES = [
  {
    get label() {
      return uiText('테마 가져오기')
    },
    value: 'import',
  },
  {
    get label() {
      return uiText('테마 내보내기')
    },
    value: 'export',
  },
] as const

export const SThemeSettings = (props: SThemeSettingsProps) => {
  const handlePage = (value: string) => {
    const page = PAGES.find((option) => option.value === value)
    if (page !== undefined) {
      props.onPageChange(page.value)
    }
  }
  return (
    <HSettingsScope
      segment={
        props.page === 'overview'
          ? null
          : {
              label: uiText('테마 화면 선택'),
              onBack: () => props.onPageChange('overview'),
              onSelect: handlePage,
              options: PAGES,
              value: props.page,
            }
      }
    >
      <div class="grid gap-4">
        <Switch>
          <Match when={props.page === 'overview'}>
            <SSettingsLinks label={uiText('테마')} options={PAGES} onChange={handlePage} />
          </Match>
          <Match when={props.page === 'import'}>
            <Show
              when={props.themes.archive()}
              keyed
              fallback={<SThemeImportActions themes={props.themes} />}
            >
              {(archive) => (
                <SThemeImport
                  archive={archive}
                  controller={props.controller}
                  themes={props.themes}
                />
              )}
            </Show>
          </Match>
          <Match when={props.page === 'export'}>
            <SThemeExportPage
              controller={props.controller}
              library={props.library}
              themes={props.themes}
            />
          </Match>
        </Switch>
        <Show when={props.page !== 'overview'}>
          <SThemeFeedback canUndo={props.page === 'import'} themes={props.themes} />
        </Show>
      </div>
    </HSettingsScope>
  )
}

const SThemeFeedback = (props: {readonly canUndo: boolean; readonly themes: ThemesController}) => (
  <div class="flex flex-wrap items-center gap-2 empty:hidden">
    <Show when={props.themes.busy()}>
      <p role="status" class="m-0 text-sm">
        {uiText('테마 처리 중…')}
      </p>
    </Show>
    <Show when={props.themes.error()}>
      {(message) => (
        <p role="alert" class="m-0 text-sm text-red-700">
          {localizeMessage(message())}
        </p>
      )}
    </Show>
    <Show when={props.themes.message()}>
      {(message) => (
        <p role="status" class="m-0 text-sm">
          {localizeMessage(message())}
        </p>
      )}
    </Show>
    <Show when={props.canUndo && props.themes.canUndo()}>
      <button
        class="theme-secondary"
        type="button"
        disabled={props.themes.busy()}
        onClick={() => props.themes.restore()}
      >
        {uiText('이전 설정 복원')}
      </button>
    </Show>
  </div>
)
