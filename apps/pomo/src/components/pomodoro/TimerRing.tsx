import {cx} from 'class-variance-authority'

interface PomodoroTimerRingProps {
  readonly icon: string
  readonly label: string
  readonly progress: string
  readonly timeLabel: string
}

export const PomodoroTimerRing = (props: PomodoroTimerRingProps) => (
  <div
    class={
      'grid size-[clamp(8.5rem,min(52vw,calc(100dvh-21rem)),14rem)] box-border ' +
      'rounded-full ' +
      'bg-[conic-gradient(var(--pomo-timer-phase)_var(--pomo-timer-progress),rgb(255_250_241_/_10%)_0)] ' +
      'p-2 ' +
      'shadow-[0_1.125rem_3rem_rgb(0_0_0_/_28%),inset_0_0.0625rem_0_rgb(255_255_255_/_10%)]'
    }
    data-pomo-timer-ring=""
    style={{'--pomo-timer-progress': props.progress}}
  >
    <div
      class={
        'relative flex size-full flex-col items-center justify-center border border-solid ' +
        'border-border rounded-full bg-[rgb(12_11_9_/_94%)]'
      }
    >
      <div
        class={
          'absolute top-[clamp(0.625rem,2.25dvh,1.125rem)] inline-flex items-center ' +
          'gap-1.5 rounded-control ' +
          'bg-[color-mix(in_srgb,var(--pomo-timer-phase)_18%,transparent)] ' +
          'px-3 py-1.5 text-xs font-750 leading-4 text-foreground'
        }
      >
        <span aria-hidden="true" class={cx(props.icon, 'size-4 text-[var(--pomo-timer-phase)]')} />
        <span>{props.label}</span>
      </div>
      <strong
        class={
          'text-[clamp(2rem,min(11vw,8dvh),3.5rem)] font-800 leading-none ' +
          'tracking--0.04em text-foreground [font-variant-numeric:tabular-nums]'
        }
      >
        {props.timeLabel}
      </strong>
    </div>
  </div>
)
