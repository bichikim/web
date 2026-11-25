import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {useSemanticRuntime} from '../features/semantics/context'
import {SPoffoActionPreview} from './SPoffoActionPreview'

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
  const handlePreview = () => {
    const widgetId = props.widgetId
    if (widgetId !== undefined) {
      runtime?.preview(widgetId, active() ? null : props.value.id)
    }
  }
  return (
    <SPoffoActionPreview
      label={props.label}
      active={active()}
      onToggle={handlePreview}
      disabled={disabled()}
    />
  )
}
