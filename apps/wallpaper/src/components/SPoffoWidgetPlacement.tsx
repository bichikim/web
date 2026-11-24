import {localizeMessage, text as uiText} from '../features/localization'

import {isTauri} from '@tauri-apps/api/core'
import {emitTo} from '@tauri-apps/api/event'
import {createSignal, Show} from 'solid-js'

interface SPoffoWidgetPlacementProps {
  readonly widgetId?: string
}
export const SPoffoWidgetPlacement = (props: SPoffoWidgetPlacementProps) => {
  const [error, setError] = createSignal<string | null>(null)
  const handleAdjust = async () => {
    const id = props.widgetId
    if (id === undefined || !isTauri()) {
      return
    }
    setError(null)
    try {
      await emitTo(`poffo-widget-${id}`, 'poffo-adjustment')
    } catch (cause) {
      console.error('Widget adjustment request failed', cause)
      setError(uiText('위젯 조정을 시작하지 못했어요.'))
    }
  }
  return (
    <section aria-label={uiText('위젯 배치')} class="grid gap-2 text-[13px]">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{uiText('배치')}</span>
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={props.widgetId === undefined || !isTauri()}
          onClick={handleAdjust}
        >
          {uiText('크기 및 위치 조정')}
        </button>
      </div>
      <Show when={error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message() ?? '')}
          </p>
        )}
      </Show>
    </section>
  )
}
