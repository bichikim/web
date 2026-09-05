export const diaryShortcuts = {
  'diary-edit-cancel':
    '[&&]:[color:rgb(var(--picture-diary-ink))] ' +
    '[&&]:[background:rgb(var(--picture-diary-rule)/6%)] ' +
    '[&&]:[border-color:rgb(var(--picture-diary-rule)/32%)] ' +
    '[&&]:hover:[background:rgb(var(--picture-diary-rule)/14%)] ' +
    '[&&]:hover:[border-color:rgb(var(--picture-diary-rule)/52%)]',
  'diary-generation-progress':
    'block appearance-none w-full h-1.5 mt-2.5 mb-1 overflow-hidden border-0 rounded ' +
    '[--progress-track:rgb(var(--pomo-color-highlight-channels)/14%)] ' +
    'bg-[var(--progress-track)] text-highlight ' +
    '[&::-webkit-progress-bar]:rounded-inherit [&::-webkit-progress-bar]:bg-[var(--progress-track)] ' +
    '[&::-webkit-progress-value]:rounded-inherit [&::-webkit-progress-value]:bg-highlight ' +
    '[&::-webkit-progress-value]:[transition:width_240ms_ease-out] ' +
    '[&::-moz-progress-bar]:rounded-inherit [&::-moz-progress-bar]:bg-highlight ' +
    '[&:indeterminate]:[background:linear-gradient(90deg,transparent,currentColor,transparent)' +
    '_-50%_0/40%_100%_no-repeat,var(--progress-track)] ' +
    '[&:indeterminate]:animate-diary-progress-pending ' +
    '[&:indeterminate::-webkit-progress-bar]:bg-transparent [&:indeterminate::-moz-progress-bar]:bg-transparent ' +
    'motion-reduce:[&:indeterminate]:animate-none motion-reduce:[&:indeterminate]:[background-position:50%_0] ' +
    'motion-reduce:[&::-webkit-progress-value]:transition-none',
  'diary-page-action':
    'box-border inline-flex min-w-8 min-h-8 cursor-pointer items-center justify-center ' +
    'border border-solid border-transparent rounded-[999rem] outline-none bg-transparent ' +
    '[color:rgb(var(--picture-diary-muted-ink))] [font:inherit] text-[0.7rem] font-700 leading-none ' +
    'p-[0.4rem] whitespace-nowrap [transition:color_160ms_ease,border-color_160ms_ease,background-color_160ms_ease] ' +
    'hover:[background:rgb(var(--picture-diary-rule)/8%)] hover:[color:rgb(var(--picture-diary-ink))] ' +
    'focus-visible:[box-shadow:0_0_0_0.125rem_rgb(var(--pomo-color-primary-channels)/72%)]',
  'diary-page-delete':
    '[&[data-confirming]]:[border-color:rgb(187_66_50/28%)] ' +
    '[&[data-confirming]]:[background:rgb(187_66_50/9%)] ' +
    '[&[data-confirming]]:[color:rgb(151_46_34)] [&[data-confirming]]:px-[0.65rem]',
} as const
