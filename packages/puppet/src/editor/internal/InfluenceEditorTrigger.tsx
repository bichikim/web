import {Collapsible} from '@kobalte/core/collapsible'
import type {JSX} from 'solid-js'

interface InfluenceEditorTriggerProps {
  readonly renderTrigger?: (trigger: JSX.Element) => JSX.Element
  readonly title?: string
}

export const InfluenceEditorTrigger = (props: InfluenceEditorTriggerProps) => {
  const trigger = (
    <Collapsible.Trigger class="influence-toggle" aria-label={props.title ?? '영향도'}>
      <span>영향도</span>
      <span class="influence-chevron puppet-icon puppet-icon-chevron-down" aria-hidden="true" />
    </Collapsible.Trigger>
  )
  return <>{props.renderTrigger?.(trigger) ?? trigger}</>
}
