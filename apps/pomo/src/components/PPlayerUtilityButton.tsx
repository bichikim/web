import {cx} from 'class-variance-authority'

export interface PPlayerUtilityButtonProps {
  readonly accessibleLabel: string
  readonly expanded?: boolean
  readonly icon: string
  readonly onPress: (source: HTMLButtonElement) => void
  readonly purpose?: 'album' | 'expand'
}

export const PPlayerUtilityButton = (props: PPlayerUtilityButtonProps) => (
  <button
    aria-expanded={props.expanded}
    aria-label={props.accessibleLabel}
    class={cx(
      'pomo-player__utility relative grid size-9 shrink-0 place-items-center rounded-full',
      'text-muted-foreground transition hover:bg-secondary-soft hover:text-foreground',
      'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary',
      'focus-visible:[outline-offset:0.125rem]',
    )}
    data-player-utility={props.purpose}
    onClick={(event) => props.onPress(event.currentTarget)}
    type="button"
  >
    <span aria-hidden="true" class={cx(props.icon, 'size-6')} />
  </button>
)
