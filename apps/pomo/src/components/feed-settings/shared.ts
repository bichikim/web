export const CLASSES = {
  feedSettings: cx(
    'grid gap-4.5 settings-compact:gap-4',
    '[&_.pomo-feed-status-frame]:w-full [&_.pomo-feed-status]:w-full',
  ),
  feedSettingsAddress: cx(
    'flex min-w-0 min-h-10 items-center gap-[0.6rem]',
    'text-highlight settings-compact:col-span-full',
  ),
  feedSettingsAddressCopy: cx(
    'grid min-w-0 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_small]:overflow-hidden [&_small]:text-ellipsis',
    '[&_strong]:text-foreground [&_strong]:text-base [&_strong]:leading-6 [&_strong]:font-[650]',
    '[&_strong]:whitespace-nowrap [&_small]:text-muted-foreground',
    '[&_small]:text-sm [&_small]:leading-[1.4]',
  ),
  feedSettingsDelete: cx(
    'inline-flex min-h-control-md box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    'border border-solid border-border rounded-control bg-transparent',
    'py-2 px-3 text-muted-foreground [font:inherit] text-sm leading-5',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease] h-10',
    '[&:hover]:bg-secondary-soft [&:hover]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:0.125rem] max-sm:w-full',
    'motion-reduce:transition-[none]',
  ),
  feedSettingsEmpty: cx(
    'm-0 rounded-panel bg-content-surface',
    'p-5 text-muted-foreground text-sm leading-[1.5] text-center settings-compact:p-4',
    'border border-dashed border-border',
  ),
  feedSettingsForm: cx(
    'grid grid-cols-[minmax(0,_1fr)_auto] items-end gap-3',
    'settings-compact:gap-2',
    'settings-compact:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:grid-cols-[minmax(0,_1fr)]',
  ),
  feedSettingsList: cx(
    'grid gap-3 m-0 p-0 list-none [&_>_li]:grid',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:grid-cols-[minmax(0,_1fr)_minmax(8.5rem,_auto)_auto] [&_>_li]:items-end',
    '[&_>_li]:gap-3 [&_>_li]:border [&_>_li]:border-solid',
    '[&_>_li]:border-content-border [&_>_li]:rounded-panel [&_>_li]:bg-content-surface',
    '[&_>_li]:px-4 [&_>_li]:py-3',
    '[&_>_li[data-recommended]]:[border-style:dashed]',
    '[&_>_li[data-recommended]]:border-[rgb(214_181_133_/_28%)]',
    '[&_>_li[data-recommended]]:bg-[rgb(214_181_133_/_4%)]',
    'settings-compact:[&_>_li]:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:[&_>_li]:grid-cols-[minmax(0,_1fr)]',
  ),
  feedSettingsListHeading: cx(
    '[&_h3]:m-0 [&_h3]:text-foreground',
    '[&_h3]:text-base [&_h3]:leading-6 [&_h3]:font-[750] flex items-center gap-[0.45rem]',
    'border-t border-solid border-border pt-4',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-sm [&_>_span]:leading-5',
  ),
  feedSettingsMessage: cx(
    'm-0 rounded-panel',
    'bg-content-surface p-5 text-muted-foreground text-sm settings-compact:p-4',
    'leading-[1.5] text-center',
  ),
  feedSettingsRecommendationHeading: cx(
    '[&_h4]:m-0 [&_h4]:text-foreground',
    '[&_h4]:text-base [&_h4]:leading-6 [&_h4]:font-[750] [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-sm [&_>_span]:leading-5 flex items-center gap-[0.45rem]',
  ),
  feedSettingsStatus: cx(
    'm-0 rounded-panel bg-content-surface',
    'p-5 text-muted-foreground text-sm leading-[1.5] text-center settings-compact:p-4',
  ),
  feedSettingsUrlField: cx(
    'grid min-w-0 gap-1.5 [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-sm [&_>_span]:leading-5 [&_>_span]:font-[650] [&_input]:w-full',
    '[&_input]:h-control-md [&_input]:box-border',
    '[&_input]:border [&_input]:border-solid [&_input]:border-border',
    '[&_input]:rounded-control [&_input]:bg-surface',
    '[&_input]:py-0 [&_input]:px-4 [&_input]:text-foreground',
    '[&_input]:[font:inherit] [&_input]:text-base [&_input]:leading-6 [&_input]:outline-none',
    '[&_input]:transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    '[&_input::placeholder]:text-muted-foreground [&_input::placeholder]:[opacity:0.7]',
    '[&_input:hover]:border-border-hover',
    '[&_input:focus-visible]:border-highlight',
    '[&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-solid ' +
      '[&_input:focus-visible]:outline-highlight',
    '[&_input:focus-visible]:[outline-offset:0.125rem] settings-compact:col-span-full',
    'motion-reduce:[&_input]:transition-[none]',
  ),
} as const

export interface RecommendedFeed {
  readonly description: string
  readonly id: string
  readonly label: string
  readonly url: string
}
import {cx} from 'class-variance-authority'
