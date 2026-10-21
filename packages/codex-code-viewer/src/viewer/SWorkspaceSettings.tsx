import {Show} from 'solid-js'
import {useTranslations} from './locale/use-translations'
import {useLocalizedMessage} from './locale/use-localized-message'
import {useWorkspaceSettings} from './use-workspace-settings'

interface SWorkspaceSettingsProps {
  /** 설정이 열리면 현재 경로를 입력란에 표시합니다. 생략하면 닫힌 상태입니다. */
  readonly active?: boolean
  /** 연결된 폴더입니다. 생략하면 경로 입력란을 비웁니다. */
  readonly workspace?: string
  /** 폴더 적용 동작입니다. 생략하면 적용 버튼을 비활성화합니다. */
  readonly onChange?: (path: string) => Promise<boolean>
}

export const SWorkspaceSettings = (props: SWorkspaceSettingsProps) => {
  const t = useTranslations()
  const localize = useLocalizedMessage()
  const selection = useWorkspaceSettings({
    active: () => props.active ?? false,
    apply: (path) => props.onChange?.(path) ?? Promise.resolve(false),
    workspace: () => props.workspace ?? '',
  })
  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault()
    selection.submit()
  }
  return (
    <form class="mb-6 space-y-2" onSubmit={handleSubmit}>
      <label class="block text-sm font-medium">
        {t('작업 폴더')}
        <input
          class="ui-field ui-focus mt-2 block h-9 w-full px-3 text-sm"
          value={selection.path()}
          onInput={(event) => selection.change(event.currentTarget.value)}
          disabled={selection.pending()}
          placeholder={t('폴더의 절대 경로')}
          required
          spellcheck={false}
        />
      </label>
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-xs leading-5 text-muted">{t('이 채팅의 코드뷰어에만 기억합니다.')}</p>
        <button
          class="ui-button shrink-0"
          type="submit"
          disabled={
            selection.pending() || selection.path().trim() === '' || props.onChange === undefined
          }
        >
          {selection.pending() ? t('적용 중…') : t('적용')}
        </button>
      </div>
      <Show when={selection.feedback()}>
        {(message) => (
          <p role="alert" class="m-0 text-sm leading-5">
            {localize(message())}
          </p>
        )}
      </Show>
    </form>
  )
}
