import {createSignal, For, onCleanup, Show, untrack} from 'solid-js'
import type {ViewerPort} from './types'
import {useTranslations} from './locale/use-translations'

interface SContextAttachmentsProps {
  readonly port: Pick<
    ViewerPort,
    'subscribeContext' | 'removeContext' | 'copyContextFiles' | 'attachContextFiles'
  >
  readonly onError: (error: unknown) => void
  readonly onNotice?: (message: string) => void
}

export const SContextAttachments = (props: SContextAttachmentsProps) => {
  const t = useTranslations()
  const [contexts, setContexts] = createSignal<readonly string[] | null>(null)
  const [busy, setBusy] = createSignal(false)
  const port = untrack(() => props.port)
  const unsubscribe = port.subscribeContext?.(setContexts)
  onCleanup(() => unsubscribe?.())
  const remove = async (index?: number): Promise<void> => {
    setBusy(true)
    try {
      await props.port.removeContext?.(index)
    } catch (error) {
      props.onError(error)
    } finally {
      setBusy(false)
    }
  }
  const copyFiles = async (): Promise<void> => {
    setBusy(true)
    try {
      await port.copyContextFiles?.()
      props.onNotice?.(t('Claude 입력창에서 Cmd+V로 붙여넣으세요.'))
    } catch (error) {
      props.onError(error)
    } finally {
      setBusy(false)
    }
  }
  const attachFiles = async (): Promise<void> => {
    setBusy(true)
    try {
      await port.attachContextFiles?.()
    } catch (error) {
      props.onError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Show when={(contexts()?.length ?? 0) > 0}>
      <details class="shrink-0 border-t border-divider px-4 py-1 text-sm">
        <summary class="cursor-pointer">
          {t('첨부할 내용 {count}개', {count: contexts()?.length ?? 0})}
        </summary>
        <ul class="m-0 max-h-32 list-none overflow-auto p-0">
          <For each={contexts() ?? []}>
            {(text, index) => (
              <li class="flex items-center gap-2 py-1">
                <span class="min-w-0 flex-1 truncate" title={text.split('\n')[0]}>
                  {text.split('\n')[0]}
                </span>
                <button
                  class="ui-button whitespace-nowrap"
                  type="button"
                  disabled={busy()}
                  onClick={() => remove(index())}
                >
                  {t('제거')}
                </button>
              </li>
            )}
          </For>
        </ul>
        <div class="flex flex-wrap items-center gap-2 py-1">
          <Show when={port.attachContextFiles}>
            <button
              class="ui-button whitespace-nowrap"
              type="button"
              disabled={busy()}
              onClick={attachFiles}
            >
              {t('Claude에 첨부')}
            </button>
          </Show>
          <Show when={port.copyContextFiles}>
            <button
              class="ui-button whitespace-nowrap"
              type="button"
              disabled={busy()}
              onClick={copyFiles}
            >
              {t('Claude 첨부로 복사')}
            </button>
          </Show>
          <button
            class="ui-button whitespace-nowrap"
            type="button"
            disabled={busy()}
            onClick={() => remove()}
          >
            {t('첨부 비우기')}
          </button>
        </div>
      </details>
    </Show>
  )
}
