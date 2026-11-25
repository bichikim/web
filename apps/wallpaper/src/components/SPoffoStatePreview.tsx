import type {AgentState, AgentStateBinding} from '@winter-love/wallpaper/settings/agent-state'
import type {CharacterAction} from '../features/semantics/types'
import type {TrackingParameter} from '../features/tracking/types'
import {useSemanticRuntime} from '../features/semantics/context'
import {SPoffoActionPreview} from './SPoffoActionPreview'

interface SPoffoStatePreviewProps {
  /** State to preview; omission disables playback. */
  readonly state?: AgentState
  /** State name announced with the playback button. */
  readonly label: string
  /** Target widget; omission disables playback. */
  readonly widgetId?: string
  /** Current actions or numeric connection; omission leaves nothing to preview. */
  readonly value?: AgentStateBinding
  /** Loaded character actions used to validate targets; omission makes actions unavailable. */
  readonly actions?: readonly CharacterAction[]
  /** Loaded numeric channels; omission makes legacy parameters unavailable. */
  readonly parameters?: readonly TrackingParameter[]
  /** Blocks starting while the character loads; omission permits starting. */
  readonly loading?: boolean
}
export const SPoffoStatePreview = (props: SPoffoStatePreviewProps) => {
  const runtime = useSemanticRuntime()
  const active = () =>
    props.state !== undefined &&
    (runtime?.previewingAgent?.(props.widgetId ?? '', props.state) ?? false)
  const available = () => {
    const targets = props.value?.actions ?? []
    return targets.length > 0
      ? targets.every((target) =>
          props.actions?.some(
            (item) => item.action.kind === target.kind && item.action.id === target.id,
          ),
        )
      : props.parameters?.some((item) => item.id === props.value?.parameterId) === true
  }
  const disabled = () =>
    runtime?.previewAgent === undefined ||
    props.widgetId === undefined ||
    props.state === undefined ||
    (!active() && (props.loading === true || !available()))
  const toggle = () => {
    if (props.widgetId !== undefined && props.state !== undefined) {
      runtime?.previewAgent?.(props.widgetId, active() ? null : props.state)
    }
  }
  return (
    <SPoffoActionPreview
      label={props.label}
      active={active()}
      disabled={disabled()}
      onToggle={toggle}
    />
  )
}
