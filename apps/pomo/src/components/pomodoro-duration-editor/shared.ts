export const CLASSES = {
  pomodoroPanelDurationActions:
    'pomo-pomodoro-panel__duration-actions grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2',
  pomodoroPanelDurationEditor: [
    'pomo-pomodoro-panel__duration-editor w-full box-border mt-2.5',
    'border border-solid border-border rounded-2xl bg-[rgb(4_4_3_/_24%)] p-3',
  ].join(' '),
  pomodoroPanelDurationField: [
    'pomo-pomodoro-panel__duration-field grid gap-1.5 text-muted-foreground',
    'text-[0.6875rem] font-[650] leading-4',
  ].join(' '),
  pomodoroPanelDurationFields:
    'pomo-pomodoro-panel__duration-fields grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2 mb-2.5',
  pomodoroPanelDurationHelp: [
    'pomo-pomodoro-panel__duration-help m-[0.5rem_0_0] text-muted-foreground',
    'text-[0.625rem] leading-3.5 text-center',
  ].join(' '),
  pomodoroPanelDurationInput: [
    'pomo-pomodoro-panel__duration-input flex items-center gap-1',
    'border border-solid border-border rounded-[0.625rem] bg-surface py-0 px-2',
    'text-muted-foreground [&:focus-within]:border-highlight [&_input]:w-full',
    '[&_input]:min-w-0 [&_input]:h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0',
    '[&_input]:text-foreground [&_input]:tabular-nums [&_input]:font-[750]',
    '[&_input]:outline-none',
  ].join(' '),
  pomodoroPanelRoutine: [
    'pomo-pomodoro-panel__routine inline-flex items-center gap-1.5 m-[1rem_0_0] border-0',
    'bg-transparent p-1 text-muted-foreground cursor-pointer text-[0.6875rem] leading-4',
    'text-center [&:hover]:text-foreground [&:focus-visible]:text-foreground',
  ].join(' '),
} as const
