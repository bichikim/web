import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {useSemanticRuntime} from '../features/semantics/context'

interface SPoffoSemanticPreviewProps {
  readonly value: SemanticBinding
  readonly widgetId?: string
  readonly label?: string
  readonly available?: boolean
  readonly loading?: boolean
}
export const SPoffoSemanticPreview = (props: SPoffoSemanticPreviewProps) => {
  const runtime = useSemanticRuntime()
  const active = () => runtime?.previewing(props.widgetId ?? '', props.value.id) ?? false
  const disabled = () =>
    runtime === undefined ||
    props.widgetId === undefined ||
    (!active() && (props.loading || !props.available || !props.value.enabled))
  const caption = () => `${props.label ?? '연결'} 수동 실행${active() ? ' 중지' : ''}`
  const handlePreview = () => {
    const widgetId = props.widgetId
    if (widgetId !== undefined) {
      runtime?.preview(widgetId, active() ? null : props.value.id)
    }
  }
  return (
    <button
      type="button"
      aria-label={caption()}
      aria-pressed={active()}
      onClick={handlePreview}
      disabled={disabled()}
      class="ml-auto shrink-0 cursor-pointer rounded-md border border-solid border-stone-300 bg-white
      px-2 py-1 text-xs text-stone-700 aria-pressed:border-blue-600 aria-pressed:text-blue-700 disabled:opacity-40"
    >
      {active() ? '중지' : '수동 실행'}
    </button>
  )
}
