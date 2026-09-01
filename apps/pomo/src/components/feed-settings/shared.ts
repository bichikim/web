export const CLASSES = {
  feedSettings: 'pomo-feed-settings grid gap-4.5 settings-compact:gap-4',
  feedSettingsAdd: cx(
    'pomo-feed-settings__add inline-flex h-control-md box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    'border border-solid border-border rounded-control bg-transparent',
    'py-0 px-3 text-muted-foreground [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    'border-highlight text-foreground',
    '[&:hover:not(:disabled)]:bg-secondary-soft',
    '[&:hover:not(:disabled)]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] [&:disabled]:[cursor:not-allowed]',
    '[&:disabled]:[opacity:0.55] max-sm:w-full motion-reduce:transition-[none]',
  ),
  feedSettingsAddress: cx(
    'pomo-feed-settings__address flex min-w-0 min-h-10 items-center gap-[0.6rem]',
    'text-highlight settings-compact:col-span-full',
  ),
  feedSettingsAddressCopy: cx(
    'pomo-feed-settings__address-copy grid min-w-0 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_small]:overflow-hidden [&_small]:text-ellipsis',
    '[&_strong]:text-foreground [&_strong]:text-xs [&_strong]:font-[650]',
    '[&_strong]:whitespace-nowrap [&_small]:text-muted-foreground',
    '[&_small]:text-[0.625rem] [&_small]:leading-[1.4]',
  ),
  feedSettingsDelete: cx(
    'pomo-feed-settings__delete inline-flex h-control-md box-border',
    'cursor-pointer items-center justify-center gap-[0.35rem]',
    'border border-solid border-border rounded-control bg-transparent',
    'py-0 px-3 text-muted-foreground [font:inherit] text-[0.7rem]',
    'font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease] h-10',
    '[&:hover]:bg-secondary-soft [&:hover]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] max-sm:w-full',
    'motion-reduce:transition-[none]',
  ),
  feedSettingsEmpty: cx(
    'pomo-feed-settings__empty m-0 rounded-panel bg-[rgb(255_255_255_/_3%)]',
    'p-5 text-muted-foreground text-xs leading-[1.5] text-center settings-compact:p-4',
    'border border-dashed border-border',
  ),
  feedSettingsForm: cx(
    'pomo-feed-settings__form grid grid-cols-[minmax(0,_1fr)_auto] items-end gap-3',
    'settings-compact:gap-2',
    'settings-compact:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:grid-cols-[minmax(0,_1fr)]',
  ),
  feedSettingsList: cx(
    'pomo-feed-settings__list grid gap-3 m-0 p-0 list-none [&_>_li]:grid',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:grid-cols-[minmax(0,_1fr)_minmax(8.5rem,_auto)_auto] [&_>_li]:items-end',
    '[&_>_li]:gap-3 [&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-panel [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:px-4 [&_>_li]:py-3',
    '[&_>_li[data-recommended]]:[border-style:dashed]',
    '[&_>_li[data-recommended]]:border-[rgb(214_181_133_/_28%)]',
    '[&_>_li[data-recommended]]:bg-[rgb(214_181_133_/_4%)]',
    'settings-compact:[&_>_li]:grid-cols-[minmax(0,_1fr)_auto]',
    'max-sm:[&_>_li]:grid-cols-[minmax(0,_1fr)]',
  ),
  feedSettingsListHeading: cx(
    'pomo-feed-settings__list-heading [&_h3]:m-0 [&_h3]:text-foreground',
    '[&_h3]:text-[0.9375rem] [&_h3]:font-[750] flex items-center gap-[0.45rem]',
    'border-t border-solid border-border pt-4',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-[0.6875rem]',
  ),
  feedSettingsMessage: cx(
    'pomo-feed-settings__message m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ),
  feedSettingsRecommendationHeading: cx(
    'pomo-feed-settings__recommendation-heading [&_h4]:m-0 [&_h4]:text-foreground',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-[0.6875rem] flex items-center gap-[0.45rem]',
  ),
  feedSettingsStatus: cx(
    'pomo-feed-settings__status m-0 rounded-panel bg-[rgb(255_255_255_/_3%)]',
    'p-5 text-muted-foreground text-xs leading-[1.5] text-center settings-compact:p-4',
  ),
  feedSettingsUrlField: cx(
    'pomo-feed-settings__url-field grid min-w-0 gap-1.5 [&_>_span]:text-muted-foreground',
    '[&_>_span]:text-xs [&_>_span]:font-[650] [&_>_span]:leading-4 [&_input]:w-full',
    '[&_input]:h-control-md [&_input]:box-border',
    '[&_input]:border [&_input]:border-solid [&_input]:border-border',
    '[&_input]:rounded-control [&_input]:bg-surface',
    '[&_input]:py-0 [&_input]:px-4 [&_input]:text-foreground',
    '[&_input]:[font:inherit] [&_input]:text-[0.8125rem] [&_input]:outline-none',
    '[&_input]:transition-[border-color_160ms_ease,_background-color_160ms_ease]',
    '[&_input::placeholder]:text-muted-foreground [&_input::placeholder]:[opacity:0.7]',
    '[&_input:hover]:border-border-hover',
    '[&_input:focus-visible]:border-highlight',
    '[&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-solid ' +
      '[&_input:focus-visible]:outline-highlight',
    '[&_input:focus-visible]:[outline-offset:2px] settings-compact:col-span-full',
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
