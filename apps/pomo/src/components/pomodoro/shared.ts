import {cx} from 'class-variance-authority'
import {GLASS_ICON_BUTTON} from '../button-presets'

const COMPACT_ACTION = cx(GLASS_ICON_BUTTON.class, 'data-[icon-only]:shadow-none')

export const CLASSES = {
  pomodoro: cx(
    'pomo-pomodoro absolute top-safe-top-mobile',
    'left-[calc(1rem_+_var(--pomo-safe-area-inset-left))]',
    'lg:top-safe-top',
    'lg:left-[1.75rem] pointer-events-auto',
  ),
  pomodoroActionIcon: 'w-4 h-4',
  pomodoroActionIndicator: cx(
    'absolute right-[-0.3125rem] bottom-[0] grid w-5 h-5',
    '[border:0.0625rem_solid_rgb(255_250_241_/_72%)] rounded-full bg-foreground',
    'shadow-[0_0.125rem_0.25rem_rgb(0_0_0_/_36%)] text-background place-items-center',
    'pointer-events-none',
  ),
  pomodoroEmotionAction: cx(
    'relative grid w-14 h-14 flex-none border-0 rounded-full',
    'bg-transparent p-0 text-inherit cursor-pointer outline-none place-items-center',
    'transition-[background-color_160ms_ease] motion-reduce:transition-[none]',
  ),
  pomodoroPanel: cx(
    '[--pomo-timer-phase:#d86845] flex items-center flex-col',
    "[&[data-phase='longBreak']]:[--pomo-timer-phase:#8d9a77]",
    "[&[data-phase='shortBreak']]:[--pomo-timer-phase:#8d9a77]",
  ),
  pomodoroPanelActions: 'flex w-full items-center gap-2.5 mt-4',
  pomodoroPanelAutoStart: cx('w-full box-border mt-4', 'border-t border-solid border-border pt-4'),
  pomodoroPanelCompactAction: COMPACT_ACTION,
  pomodoroPanelCompactActionDanger: cx(
    COMPACT_ACTION,
    'border-[rgb(239_138_116_/_34%)]',
    '[&_[data-pomo-button-icon]]:text-danger',
  ),
  pomodoroPanelPrimaryAction: cx(
    'min-w-0 flex-1 [&]:text-base [&]:leading-6',
    '[&>span[aria-hidden]]:size-6',
  ),
  pomodoroPanelSession: cx(
    'w-2 h-2 border border-solid border-border-hover',
    'rounded-full bg-transparent [&[data-complete]]:border-[var(--pomo-timer-phase)]',
    '[&[data-complete]]:bg-[var(--pomo-timer-phase)]',
  ),
  pomodoroPanelSessionReset: cx(
    'inline-flex items-center gap-1 border-0 bg-transparent',
    'p-1 text-muted-foreground cursor-pointer text-sm leading-5',
    '[&:hover]:text-danger [&:focus-visible]:text-danger',
  ),
  pomodoroPanelSessionRow: 'flex items-center gap-2 mt-4',
  pomodoroPanelSessions: 'flex gap-2',
  pomodoroTimeAction: cx(
    'grid h-full min-w-13 border-0',
    'rounded-control bg-transparent p-[0_0.875rem_0_0.375rem] text-inherit',
    'cursor-pointer outline-none place-items-center transition-[background-color_160ms_ease]',
    'motion-reduce:transition-[none]',
  ),
  pomodoroTrigger: cx(
    'relative inline-flex box-border h-control-md min-w-27',
    'items-center overflow-visible',
    'text-foreground shadow-panel',
    'transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    'motion-reduce:transition-[none]',
  ),
  pomodoroTriggerTime: cx(
    'text-lg text-foreground tabular-nums font-extrabold',
    'tracking-[0.025em] leading-6',
  ),
} as const
