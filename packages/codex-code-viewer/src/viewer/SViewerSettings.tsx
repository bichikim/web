import {STooltip} from './STooltip'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
} from 'solid-js'
import {SSelect} from './SSelect'
import {SIcon} from './SIcon'
import {MAX_NAVIGATION_PREVIEW_LINES} from '../shared/contracts'
import {useTranslations} from './locale/use-translations'
import type {LanguagePreference} from './locale/types'
import {DEFAULT_VIEWER_LANGUAGE, VIEWER_LANGUAGES} from './locale/languages'
import {SWorkspaceSettings} from './SWorkspaceSettings'
import {SPluginUpdates} from './SPluginUpdates'
import type {ViewerPort} from './types'

interface SViewerSettingsProps {
  /** 현재 작업 폴더입니다. 생략하면 연결되지 않은 상태로 표시합니다. */
  readonly workspace?: string
  /** 현재 채팅의 작업 폴더를 변경합니다. 생략하면 변경란을 표시하지 않습니다. */
  readonly onWorkspaceChange?: (path: string) => Promise<boolean>
  readonly port?: Pick<ViewerPort, 'call'>
  readonly open?: boolean
  readonly previewLines?: number
  readonly language?: LanguagePreference
  readonly onLanguageChange?: (language: LanguagePreference) => void
  readonly onChange?: (lines: number) => void
  readonly onClose?: () => void
}
const sample = ['interface User {', '  id: string', '  name: string', '  active: boolean', '}']
export const SViewerSettings = (props: SViewerSettingsProps) => {
  const t = useTranslations()
  const lineLabel = (count: number): string => (count === 1 ? t('1줄') : t('{count}줄', {count}))
  const lineOptions = createMemo(() =>
    Array.from({length: MAX_NAVIGATION_PREVIEW_LINES}, (_, index) => lineLabel(index + 1)),
  )
  const languageOptions = createMemo(
    () =>
      [{label: t('자동'), value: 'auto'}, ...VIEWER_LANGUAGES] satisfies {
        value: LanguagePreference
        label: string
      }[],
  )
  const changeLines = (value: string): void => {
    const index = lineOptions().indexOf(value)
    if (index >= 0) {
      props.onChange?.(index + 1)
    }
  }
  const changeLanguage = (label: string): void => {
    const option = languageOptions().find((option) => option.label === label)
    if (option !== undefined) {
      props.onLanguageChange?.(option.value)
    }
  }
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  const title = createUniqueId()
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.open && !dialog.open) {
      dialog.showModal()
    } else if (!props.open && dialog.open) {
      dialog.close()
    }
  })
  onCleanup(() => {
    const dialog = element()
    if (dialog?.open) {
      dialog.close()
    }
  })
  const cancel = (event: Event): void => {
    event.preventDefault()
    props.onClose?.()
  }
  return (
    <dialog
      ref={setElement}
      aria-labelledby={title}
      class="ui-entry-dialog max-h-[calc(100dvh-32px)] flex-col overflow-hidden p-0 open:flex"
      onCancel={cancel}
      onClose={() => props.onClose?.()}
    >
      <div class="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <h2 id={title} class="m-0 text-base font-semibold">
          {t('설정')}
        </h2>
        <STooltip content={t('설정 닫기')}>
          {(description) => (
            <button
              aria-describedby={description}
              type="button"
              class="ui-icon-button -mr-2"
              aria-label={t('설정 닫기')}
              onClick={() => props.onClose?.()}
            >
              <SIcon name="close" />
            </button>
          )}
        </STooltip>
      </div>
      <div class="min-h-0 overflow-y-auto overscroll-contain px-6 pb-2">
        <Show when={props.onWorkspaceChange}>
          {(change) => (
            <SWorkspaceSettings
              active={props.open}
              workspace={props.workspace}
              onChange={change()}
            />
          )}
        </Show>
        <div class="mb-6 space-y-2">
          <span class="block text-sm font-medium">{t('언어')}</span>
          <SSelect
            label={t('언어')}
            options={languageOptions().map((option) => option.label)}
            value={
              languageOptions().find(
                (option) => option.value === (props.language ?? DEFAULT_VIEWER_LANGUAGE),
              )?.label
            }
            variant="field"
            onChange={changeLanguage}
          />
          <p class="m-0 text-xs leading-5 text-muted">
            {t('자동은 앱 언어를 따릅니다. 지원하지 않는 언어는 영어로 표시합니다.')}
          </p>
        </div>
        <div class="space-y-2">
          <span class="block text-sm font-medium">{t('미리보기 줄 수')}</span>
          <SSelect
            label={t('미리보기 줄 수')}
            options={lineOptions()}
            value={lineLabel(props.previewLines ?? 2)}
            variant="field"
            onChange={changeLines}
          />
        </div>
        <div class="mt-4 rounded-control border border-divider bg-surface px-3 py-3">
          <span class="mb-2 block text-xs text-muted">{t('미리보기')}</span>
          <code class="block font-mono text-xs leading-5">
            <For each={sample.slice(0, props.previewLines ?? 2)}>
              {(line, index) => (
                <span class="flex gap-3">
                  <span aria-hidden="true" class="w-3 shrink-0 text-right tabular-nums text-muted">
                    {index() + 1}
                  </span>
                  <span class="whitespace-pre">{line}</span>
                </span>
              )}
            </For>
          </code>
        </div>
      </div>
      <div class="shrink-0 px-6 pb-6">
        <Show when={props.port}>
          {(port) => <SPluginUpdates active={props.open} port={port()} />}
        </Show>
        <div class="flex justify-end pt-4">
          <button type="button" class="ui-button" onClick={() => props.onClose?.()}>
            {t('닫기')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
