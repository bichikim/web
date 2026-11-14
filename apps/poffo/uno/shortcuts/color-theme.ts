export const colorThemeShortcuts = {
  'color-theme-color-probe':
    'hidden [color:color-mix(in_srgb,var(--color-theme-probe)_100%,transparent)]',
  'color-theme-dialog': [
    'auto-mesh-dialog-content m-0 box-border',
    '[&:not([open])]:hidden [&::backdrop]:[background:color-mix(in_srgb,var(--puppet-color-backdrop,#' +
      '030706)_72%,transparent)]',
    '[&::backdrop]:backdrop-blur-sm',
    '[&_details]:grid [&_details]:gap-editor-group',
    '[&_summary]:cursor-pointer [&_summary]:text-editor-body',
    '[&_summary:focus-visible]:outline [&_summary:focus-visible]:outline-[var(--puppet-color-accent,#64e5c4)]',
    '[&_footer]:justify-between [&_footer]:flex-wrap',
    '[&_footer_>div]:flex [&_footer_>div]:gap-editor-field',
    '[&_footer_.editor-button.primary]:bg-[var(--puppet-color-accent,#64e5c4)]',
    '[&_footer_.editor-button.primary]:text-[var(--puppet-color-on-accent,#07110f)]',
  ],
  'color-theme-fields': [
    'grid gap-editor-group [&_>div]:grid [&_>div]:items-center',
    '[&_>div]:[grid-template-columns:minmax(0,1fr)_9rem] [&_>div]:gap-editor-field',
    '[&_>div_>span]:text-editor-body',
    '[&_>div_>.editor-color-field]:w-full',
    '[details_&]:mt-editor-group',
  ],
  'color-theme-scope': '!contents',
  'color-theme-status-preview': 'grid grid-cols-2 gap-editor-field',
}
