export const CLASSES = {
  pomodoro: [
    'pomo-pomodoro absolute top-[calc(1rem_+_var(--pomo-safe-area-inset-top))]',
    'left-[calc(1rem_+_var(--pomo-safe-area-inset-left))] lg:top-[1.5rem]',
    'lg:left-[1.75rem] pointer-events-auto',
  ].join(' '),
  pomodoroActionIcon: 'pomo-pomodoro__action-icon w-3 h-3',
  pomodoroActionIndicator: [
    'pomo-pomodoro__action-indicator absolute right-[-0.3125rem] bottom-[0] grid w-5 h-5',
    '[border:1px_solid_rgb(255_250_241_/_72%)] rounded-full bg-foreground',
    'shadow-[0_0.125rem_0.25rem_rgb(0_0_0_/_36%)] text-background place-items-center',
    'pointer-events-none',
  ].join(' '),
  pomodoroEmotionAction: [
    'pomo-pomodoro__emotion-action relative grid w-14 h-14 flex-none border-0 rounded-full',
    'bg-transparent p-0 text-inherit cursor-pointer outline-none place-items-center',
    'transition-[background-color_160ms_ease] motion-reduce:transition-[none]',
  ].join(' '),
  pomodoroPanel: [
    'pomo-pomodoro-panel [--pomo-timer-phase:#d86845] flex items-center flex-col',
    "[&[data-phase='longBreak']]:[--pomo-timer-phase:#8d9a77]",
    "[&[data-phase='shortBreak']]:[--pomo-timer-phase:#8d9a77]",
  ].join(' '),
  pomodoroPanelActions: 'pomo-pomodoro-panel__actions flex w-full items-center gap-2.5 mt-4',
  pomodoroPanelAutoStart: [
    'pomo-pomodoro-panel__auto-start w-full box-border mt-4',
    'border-t border-solid border-border pt-4',
  ].join(' '),
  pomodoroPanelCompactAction: 'pomo-pomodoro-panel__compact-action shadow-none',
  pomodoroPanelCompactActionDanger: [
    'pomo-pomodoro-panel__compact-action--danger border-[rgb(239_138_116_/_34%)]',
    '[&_[data-pomo-icon-button-icon]]:text-danger',
  ].join(' '),
  pomodoroPanelPrimaryAction: 'pomo-pomodoro-panel__primary-action min-w-0 flex-1',
  pomodoroPanelSession: [
    'pomo-pomodoro-panel__session w-2 h-2 border border-solid border-border-hover',
    'rounded-full bg-transparent [&[data-complete]]:border-[var(--pomo-timer-phase)]',
    '[&[data-complete]]:bg-[var(--pomo-timer-phase)]',
  ].join(' '),
  pomodoroPanelSessionReset: [
    'pomo-pomodoro-panel__session-reset inline-flex items-center gap-1 border-0 bg-transparent',
    'p-1 text-muted-foreground cursor-pointer text-[0.625rem] leading-3.5',
    '[&:hover]:text-danger [&:focus-visible]:text-danger',
  ].join(' '),
  pomodoroPanelSessionRow: 'pomo-pomodoro-panel__session-row flex items-center gap-2 mt-4',
  pomodoroPanelSessions: 'pomo-pomodoro-panel__sessions flex gap-2',
  pomodoroTimeAction: [
    'pomo-pomodoro__time-action grid h-full min-w-13 border-0',
    'rounded-control bg-transparent p-[0_0.875rem_0_0.375rem] text-inherit',
    'cursor-pointer outline-none place-items-center transition-[background-color_160ms_ease]',
    'motion-reduce:transition-[none]',
  ].join(' '),
  pomodoroTrigger: [
    'pomo-pomodoro__trigger relative inline-flex box-border h-control-md min-w-27',
    'items-center overflow-visible',
    'text-foreground shadow-panel',
    'transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    'motion-reduce:transition-[none]',
  ].join(' '),
  pomodoroTriggerTime: [
    'pomo-pomodoro__trigger-time text-foreground text-sm tabular-nums font-extrabold',
    'tracking-[0.025em] leading-4',
  ].join(' '),
} as const
