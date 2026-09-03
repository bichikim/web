import {cx} from 'class-variance-authority'
import type {JSX} from 'solid-js'

const EMPTY_STATE_CLASSES = cx(
  'm-0 rounded-panel border border-dashed border-border bg-content-surface',
  'p-5 text-center text-xs leading-[1.5] text-muted-foreground settings-compact:p-4',
)

export interface PSettingsEmptyStateProps {
  readonly children: JSX.Element
  readonly class?: string
}

export const PSettingsEmptyState = (props: PSettingsEmptyStateProps) => (
  <p class={cx(EMPTY_STATE_CLASSES, props.class)}>{props.children}</p>
)
