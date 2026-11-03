export const propertiesShortcuts = {
  'inspector-extension-mount': [
    '[.puppet-editor_&]:contents [.puppet-editor_&_>_div]:contents',
    '[.puppet-editor_&_>_div_>_.deformer-properties]:m-0',
  ],
  'inspector-panel': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[grid-template-rows:minmax(0,_1fr)]',
    '[.puppet-editor_&]:p-0 [.puppet-editor_&]:min-h-0 [.puppet-editor_&]:gap-0',
    '[.puppet-editor_&]:[grid-area:inspector] [.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&]:[border-left:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],
  'mask-action-button': [
    '[.puppet-editor_&]:inline-flex [.puppet-editor_&]:items-center [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:[height:var(--editor-control-height)]',
    '[.puppet-editor_&]:[min-height:var(--editor-control-height)]',
    '[.puppet-editor_&]:py-0 [.puppet-editor_&]:px-editor-control',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)] ' +
      '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#b5c5bf)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-control,#17211e)]',
    '[.puppet-editor_&]:text-editor-body [.puppet-editor_&]:[line-height:1rem] [.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&:hover:not(:disabled)]:[border-color:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&:hover:not(:disabled)]:[outline:none]',
    '[.puppet-editor_&:focus-visible]:[border-color:var(--puppet-color-accent,#64e5c4)] ' +
      '[.puppet-editor_&:focus-visible]:[outline:none]',
    '[.puppet-editor_&:disabled]:[opacity:0.42] [.puppet-editor_&:disabled]:cursor-not-allowed',
  ],
  'mask-actions': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-wrap',
    '[.puppet-editor_&]:gap-editor-related',
  ],
  'mask-chip': [
    '[.puppet-editor_&]:[display:inline-grid] [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:[grid-template-columns:1.25rem_minmax(0,_1fr)_1.25rem] [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:p-editor-tight',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)] ' +
      '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text,#d9eee8)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-control,#17231f)]',
    '[.puppet-editor_&]:text-editor-metadata',
    '[.puppet-editor_&_>_span]:overflow-hidden [.puppet-editor_&_>_span]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_>_span]:whitespace-nowrap',
    '[.puppet-editor_&_img]:[width:1.25rem] [.puppet-editor_&_img]:[height:1.25rem]',
    '[.puppet-editor_&_img]:[border-radius:0.25rem] ' +
      '[.puppet-editor_&_img]:[background:var(--puppet-color-hover,#25312d)]',
    '[.puppet-editor_&_img]:[object-fit:contain]',
    '[.puppet-editor_&_button]:grid [.puppet-editor_&_button]:[width:1.25rem]',
    '[.puppet-editor_&_button]:[height:1.25rem] [.puppet-editor_&_button]:p-0',
    '[.puppet-editor_&_button]:place-items-center [.puppet-editor_&_button]:[border:0]',
    '[.puppet-editor_&_button]:[border-radius:0.25rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-muted,#93a29d)]',
    '[.puppet-editor_&_button]:[background:transparent] [.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button:hover:not(:disabled)]:[color:var(--puppet-color-text,#f4f8f6)]',
    '[.puppet-editor_&_button:hover:not(:disabled)]:[background:var(--puppet-color-hover,#293832)]',
    '[.puppet-editor_&_button:hover:not(:disabled)]:[outline:none]',
    '[.puppet-editor_&_button:focus-visible]:[color:var(--puppet-color-text,#f4f8f6)]',
    '[.puppet-editor_&_button:focus-visible]:[background:var(--puppet-color-hover,#293832)]',
    '[.puppet-editor_&_button:focus-visible]:[outline:none]',
    '[.puppet-editor_&_button:disabled]:[opacity:0.42] [.puppet-editor_&_button:disabled]:cursor-not-allowed',
  ],
  'mask-chip-list': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:[min-height:1.75rem] [.puppet-editor_&]:flex-wrap',
    '[.puppet-editor_&]:gap-editor-related [.puppet-editor_&]:items-center',
  ],
  'mask-empty-state': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)] [.puppet-editor_&]:text-editor-metadata',
  ],
  'mask-pick-notice': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:mb-editor-field [.puppet-editor_&]:p-editor-field',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)] ' +
      '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text,#c7f7e9)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-selected,#173029)]',
    '[.puppet-editor_&]:text-editor-metadata',
  ],
  'mask-picker': [
    'editor-type-root',
    '[.puppet-editor_&]:[width:min(18.75rem,_calc(100vw_-_1.5rem))] [.puppet-editor_&]:p-editor-field',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#45544f)] ' +
      '[.puppet-editor_&]:[border-radius:0.5625rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text,#dfe8e4)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-panel,#111816)]',
    '[.puppet-editor_&]:[box-shadow:0_0.75rem_2.125rem_color-mix(in_srgb,var(--puppet-color-shadow,#0' +
      '00000)_42%,transparent)]',
  ],
  'mask-picker-count': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)] [.puppet-editor_&]:text-editor-metadata',
  ],
  'mask-picker-empty': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)] [.puppet-editor_&]:text-editor-metadata',
  ],
  'mask-picker-heading': [
    '[.puppet-editor_&_button]:grid [.puppet-editor_&_button]:[width:1.25rem]',
    '[.puppet-editor_&_button]:[height:1.25rem] [.puppet-editor_&_button]:p-0',
    '[.puppet-editor_&_button]:place-items-center [.puppet-editor_&_button]:[border:0]',
    '[.puppet-editor_&_button]:[border-radius:0.25rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-muted,#93a29d)]',
    '[.puppet-editor_&_button]:[background:transparent] [.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button:hover]:[color:var(--puppet-color-text,#f4f8f6)] ' +
      '[.puppet-editor_&_button:hover]:[background:var(--puppet-color-hover,#293832)]',
    '[.puppet-editor_&_button:hover]:[outline:none]',
    '[.puppet-editor_&_button:focus-visible]:[color:var(--puppet-color-text,#f4f8f6)]',
    '[.puppet-editor_&_button:focus-visible]:[background:var(--puppet-color-hover,#293832)]',
    '[.puppet-editor_&_button:focus-visible]:[outline:none]',
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between',
    '[.puppet-editor_&]:mb-editor-field',
    '[.puppet-editor_&_h2]:m-0 [.puppet-editor_&_h2]:[color:var(--puppet-color-text,#dfe8e4)]',
    '[.puppet-editor_&_h2]:editor-type-section',
  ],
  'mask-picker-label': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-tight',
    '[.puppet-editor_&_strong]:overflow-hidden [.puppet-editor_&_strong]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_strong]:whitespace-nowrap',
    '[.puppet-editor_&_small]:overflow-hidden [.puppet-editor_&_small]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_small]:whitespace-nowrap',
    '[.puppet-editor_&_strong]:text-editor-caption',
    '[.puppet-editor_&_small]:[color:var(--puppet-color-text-muted,#82908b)] ' +
      '[.puppet-editor_&_small]:text-editor-micro',
  ],
  'mask-picker-list': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[max-height:13.75rem] [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:my-editor-field [.puppet-editor_&]:mx-0 [.puppet-editor_&]:overflow-y-auto',
    '[.puppet-editor_&_label]:grid [.puppet-editor_&_label]:min-w-0',
    '[.puppet-editor_&_label]:[grid-template-columns:auto_1.5rem_minmax(0,_1fr)_auto]',
    '[.puppet-editor_&_label]:gap-editor-control [.puppet-editor_&_label]:items-center',
    '[.puppet-editor_&_label]:p-editor-related [.puppet-editor_&_label]:[border-radius:0.375rem]',
    '[.puppet-editor_&_label]:[color:var(--puppet-color-text-secondary,#cbd7d3)] ' +
      '[.puppet-editor_&_label]:cursor-pointer',
    '[.puppet-editor_&_label:hover]:[background:var(--puppet-color-selected,#1c2824)]',
    '[.puppet-editor_&_label:has(input:disabled)]:[opacity:0.42]',
    '[.puppet-editor_&_label:has(input:disabled)]:cursor-not-allowed',
  ],
  'mask-picker-reason': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#82908b)] [.puppet-editor_&]:text-editor-micro',
  ],
  'mask-picker-thumbnail': [
    '[.puppet-editor_&]:[width:1.25rem] [.puppet-editor_&]:[height:1.25rem]',
    '[.puppet-editor_&]:[border-radius:0.25rem] [.puppet-editor_&]:[background:var(--puppet-color-hover,#25312d)]',
    '[.puppet-editor_&]:[object-fit:contain]',
    '[.puppet-editor_&]:grid [.puppet-editor_&]:place-items-center [.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&_img]:block [.puppet-editor_&_img]:w-full [.puppet-editor_&_img]:h-full',
    '[.puppet-editor_&_img]:[object-fit:contain]',
  ],
  'mask-usage-count': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)] [.puppet-editor_&]:text-editor-metadata',
  ],
  'part-mask-properties': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-control [.puppet-editor_&]:m-0',
    '[.puppet-editor_&]:mt-editor-tight',
    '[.puppet-editor_&]:p-editor-field ' +
      '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-divider,#2a3430)]',
    '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&_label]:[grid-template-columns:auto_minmax(0,_1fr)]',
  ],
  'physics-action-button': [
    '[.puppet-editor_&]:inline-flex [.puppet-editor_&]:items-center [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:py-0 [.puppet-editor_&]:px-editor-control [.puppet-editor_&]:text-editor-metadata',
  ],
  'physics-empty': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:mt-editor-tight ' +
      '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&]:text-editor-metadata [.puppet-editor_&]:[line-height:1.5]',
  ],
  'physics-header': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:justify-between [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_>_span]:overflow-hidden [.puppet-editor_&_>_span]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_>_span]:whitespace-nowrap ' +
      '[.puppet-editor_&_>_span]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&_>_span]:text-editor-metadata',
  ],
  'physics-input-group': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&]:[grid-template-columns:repeat(auto-fit,_minmax(min(15rem,_100%),_1fr))]',
    '[.puppet-editor_&]:p-editor-field ' +
      '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&]:[border-radius:0.4375rem] [.puppet-editor_&]:[background:var(--puppet-color-panel,#111816)]',
  ],
  'physics-input-header': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between',
    '[.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_strong]:[color:var(--puppet-color-text,#d9eee8)] ' +
      '[.puppet-editor_&_strong]:text-editor-caption',
    '[.puppet-editor_&_span]:[color:var(--puppet-color-accent,#64e5c4)] [.puppet-editor_&_span]:text-editor-metadata',
    '[.puppet-editor_&]:[grid-column:1_/_-1]',
  ],
  'physics-number-fields': ['[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-control'],
  'physics-parameter-fields': ['[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-control'],
  'physics-pendulum': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:p-editor-field ' +
      '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-divider,#2a3430)]',
    '[.puppet-editor_&]:[border-radius:0.375rem] [.puppet-editor_&]:[background:var(--puppet-color-input,#121a17)]',
  ],
  'physics-pendulum-header': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:justify-between [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_h3]:m-0 [.puppet-editor_&_h3]:min-w-0 [.puppet-editor_&_h3]:truncate',
    '[.puppet-editor_&_h3]:[color:var(--puppet-color-text-secondary,#bfeee1)] ' +
      '[.puppet-editor_&_h3]:text-editor-caption',
    '[.puppet-editor_&_code]:ml-editor-related ' +
      '[.puppet-editor_&_code]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&_code]:font-editor-mono',
    '[.puppet-editor_&_code]:text-editor-micro',
  ],
  'physics-pendulum-list': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:mt-editor-tight',
  ],
  'physics-properties': '[.puppet-editor_&]:mb-0',
  'physics-remove-button': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[width:1.5rem] [.puppet-editor_&]:[min-width:1.5rem]',
    '[.puppet-editor_&]:p-0 [.puppet-editor_&]:[color:var(--puppet-color-text-muted,#93a29d)]',
    '[.puppet-editor_&_.puppet-icon]:[width:0.75rem] [.puppet-editor_&_.puppet-icon]:[height:0.75rem]',
  ],
  'physics-settings': [
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:mt-editor-control',
    '[.puppet-editor_&_summary]:cursor-pointer ' +
      '[.puppet-editor_&_summary]:text-[var(--puppet-color-text-secondary,#bfeee1)]',
    '[.puppet-editor_&_summary]:text-editor-caption',
    '[.puppet-editor_&_>_.physics-number-fields]:mt-editor-field',
  ],
  'puppet-layer-mask-usage': [
    '[.puppet-editor_&]:inline-flex [.puppet-editor_&]:[min-width:1.625rem] [.puppet-editor_&]:gap-editor-tight',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:justify-center [.puppet-editor_&]:[margin-left:auto]',
    '[.puppet-editor_&]:py-editor-tight [.puppet-editor_&]:px-editor-related',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)]',
    '[.puppet-editor_&]:[border-radius:62.4375rem] ' +
      '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#9fe7d4)]',
    '[.puppet-editor_&]:[background:var(--puppet-color-selected,#14231f)] [.puppet-editor_&]:text-editor-micro',
    '[.puppet-editor_&_.puppet-icon]:[width:0.625rem] [.puppet-editor_&_.puppet-icon]:[height:0.625rem]',
  ],
}
