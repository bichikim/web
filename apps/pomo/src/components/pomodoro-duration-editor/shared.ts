import {cx} from 'class-variance-authority'

export const CLASSES = {
  pomodoroPanelDurationActions: 'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2',
  pomodoroPanelDurationEditor: cx(
    'w-full box-border mt-2.5',
    'border border-solid border-border rounded-2xl bg-[rgb(4_4_3_/_24%)] p-3',
  ),
  pomodoroPanelDurationField: cx(
    'grid gap-1.5 text-muted-foreground',
    'text-sm leading-5 font-[650]',
  ),
  pomodoroPanelDurationFields: 'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2 mb-2.5',
  pomodoroPanelDurationHelp: cx(
    'm-[0.5rem_0_0] text-muted-foreground',
    'text-sm leading-5 text-center',
  ),
  pomodoroPanelRoutine: cx(
    'inline-flex items-center gap-1.5 m-[1rem_0_0] border-0',
    'bg-transparent p-1 text-muted-foreground cursor-pointer text-sm leading-5',
    'text-center [&:hover]:text-foreground [&:focus-visible]:text-foreground',
  ),
} as const
