export const layoutShortcuts = {
  'editor-track-columns': '[grid-template-columns:13.75rem_minmax(0,_1fr)]',
  'grid-curve-button': [
    '[.puppet-editor_&]:[min-height:1.625rem] [.puppet-editor_&]:p-editor-related',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#53655f)] ' +
      '[.puppet-editor_&]:[border-radius:0.3125rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#bfeee1)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-control,#17211e)]',
    '[.puppet-editor_&]:text-editor-metadata [.puppet-editor_&]:whitespace-nowrap',
    '[.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&:disabled]:[opacity:0.42] [.puppet-editor_&:disabled]:cursor-not-allowed',
  ],
  'grid-point-row': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[grid-template-columns:3.375rem_minmax(0,_1fr)]',
    '[.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:items-center ' +
      '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&]:text-editor-metadata',
    '[.puppet-editor_&]:[grid-template-columns:minmax(0,_1fr)_minmax(0,_1fr)_auto]',
  ],
  'grid-resolution': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[grid-template-columns:minmax(0,_1fr)]',
    '[.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_label]:[grid-template-columns:3.375rem_minmax(5.625rem,_1fr)]',
  ],
  'modeling-panel': [
    '[.puppet-editor_&]:[grid-area:timeline] [.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:min-h-0 [.puppet-editor_&]:[border-top:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
    '[.puppet-editor_&]:[background:var(--puppet-color-panel,#111614)]',
  ],
  notice: [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#788681)] [.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&]:my-editor-section [.puppet-editor_&]:mx-editor-field [.puppet-editor_&]:[line-height:1.6]',
  ],
  panel: [
    '[.puppet-editor_&]:min-h-0 [.puppet-editor_&]:p-editor-group',
    '[.puppet-editor_&]:[background:var(--puppet-color-panel,#101513)]',
  ],
  'panel-add-button': [
    '[.puppet-editor_&]:inline-flex [.puppet-editor_&]:w-auto [.puppet-editor_&]:shrink-0',
    '[.puppet-editor_&]:py-0 [.puppet-editor_&]:px-editor-field [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:justify-center',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)] ' +
      '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#bfeee1)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-control,#17211e)]',
    '[.puppet-editor_&]:cursor-pointer',
  ],
  'panel-heading': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between',
    '[.puppet-editor_&]:[min-height:2.125rem] [.puppet-editor_&]:mb-editor-group',
    '[.puppet-editor_&_h2]:m-0 [.puppet-editor_&_h2]:[color:var(--puppet-color-text-secondary,#a7b3af)]',
    '[.puppet-editor_&_h2]:editor-type-section [.puppet-editor_&_h2]:[letter-spacing:0.12rem]',
    '[.puppet-editor_&_h2]:[text-transform:uppercase]',
    '[.puppet-editor_&_>_span]:grid [.puppet-editor_&_>_span]:[min-width:1.375rem]',
    '[.puppet-editor_&_>_span]:[height:1.375rem] [.puppet-editor_&_>_span]:place-items-center',
    '[.puppet-editor_&_>_span]:[border:0.0625rem_solid_var(--puppet-color-border,#313b37)]',
    '[.puppet-editor_&_>_span]:[border-radius:0.375rem] ' +
      '[.puppet-editor_&_>_span]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&_>_span]:text-editor-caption',
  ],
  'panel-note': [
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#788681)] [.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&]:my-editor-section [.puppet-editor_&]:mx-editor-field [.puppet-editor_&]:[line-height:1.6]',
  ],
  'panel-resizer': [
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:min-h-0 ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-divider,#27302d)]',
    '[.puppet-editor_&]:touch-none',
    '[.puppet-editor_&:hover]:[outline:none] ' +
      '[.puppet-editor_&:hover]:[background:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&.dragging]:[outline:none] ' +
      '[.puppet-editor_&.dragging]:[background:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&:focus-visible]:[outline:none] ' +
      '[.puppet-editor_&:focus-visible]:[background:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&.left]:[grid-area:left-resizer] [.puppet-editor_&.left]:[cursor:col-resize]',
    '[.puppet-editor_&.right]:[grid-area:right-resizer] [.puppet-editor_&.right]:[cursor:col-resize]',
    '[.puppet-editor_&.bottom]:[grid-area:bottom-resizer] [.puppet-editor_&.bottom]:[cursor:row-resize]',
  ],
  'puppet-editor': [
    'editor-type-root',
    '[container-type:inline-size]',
    '[container-name:puppet-workspace]',
    '[--editor-control-height:1.40625rem]',
    '[--bottom-grid-size:var(--bottom-panel-size,_16.25rem)] [--bottom-resizer-size:0.375rem]',
    '[--left-grid-size:var(--left-panel-size,_18.75rem)] [--left-resizer-size:0.375rem]',
    '[--right-grid-size:var(--right-panel-size,_16.25rem)] [--right-resizer-size:0.375rem] grid',
    'editor-workspace-grid',
    '[&.without-header]:[--header-minimum-size:0rem]',
    'w-full min-w-0 h-full [min-height:40rem] overflow-hidden [color:var(--puppet-color-text,#edf4f0)] ' +
      '[background:var(--puppet-color-panel,#101513)]',
    '[&.left-panel-closed]:[--left-grid-size:0rem] [&.left-panel-closed]:[--left-resizer-size:0rem]',
    '[&.right-panel-closed]:[--right-grid-size:0rem] [&.right-panel-closed]:[--right-resizer-size:0rem]',
    '[&.bottom-panel-closed]:[--bottom-grid-size:0rem] [&.bottom-panel-closed]:[--bottom-resizer-size:0rem]',
    '[&.left-panel-closed_.layers-panel]:hidden',
    '[&.right-panel-closed_.inspector-panel]:hidden',
    '[&.bottom-panel-closed_.modeling-panel]:hidden',
    '[&.bottom-panel-closed_.timeline]:hidden',
    '[&.bottom-panel-closed_.keyform-panel]:hidden',
    '[&.left-panel-closed_.panel-resizer.left]:hidden',
    '[&.right-panel-closed_.panel-resizer.right]:hidden',
    '[&.bottom-panel-closed_.panel-resizer.bottom]:hidden',
    'box-border',
    '[&_*]:box-border',
    '[&_button]:[color:inherit]',
  ],
  'puppet-selection-actions': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-wrap [.puppet-editor_&]:gap-editor-control',
    '[.puppet-editor_&_button]:[min-height:1.625rem] [.puppet-editor_&_button]:py-editor-related',
    '[.puppet-editor_&_button]:px-editor-field',
    '[.puppet-editor_&_button]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_button]:[border-radius:0.4375rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-secondary,#b5c5bf)]',
    '[.puppet-editor_&_button]:[background:var(--puppet-color-control,#17211e)] ' +
      '[.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button]:text-left [.puppet-editor_&_button]:editor-type-control',
    '[.puppet-editor_&_button]:[line-height:1rem] [.puppet-editor_&_button]:max-w-full',
    '[.puppet-editor_&_button:hover:not(:disabled)]:[border-color:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_button:hover:not(:disabled)]:[outline:none]',
    '[.puppet-editor_&_button:focus-visible]:[border-color:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_button:focus-visible]:[outline:none]',
    '[.puppet-editor_&_button:disabled]:[opacity:0.45] [.puppet-editor_&_button:disabled]:cursor-not-allowed',
  ],
  'renderer-status': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:ml-editor-related',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#a7b3af)] [.puppet-editor_&]:text-editor-reading',
    "[.puppet-editor_&[data-status='error']_.status-dot]:[background:var(--puppet-color-error,#ff7a76)]",
    "[.puppet-editor_&[data-status='error']_.status-dot]:" +
      '[box-shadow:0_0_0_0.25rem_color-mix(in_srgb,var(--puppet-color-error,#ff7a76)_10%,transparent)]',
    '[@media(max-width:67.5rem)]:[.puppet-editor_&]:hidden',
  ],
  'status-dot': [
    '[.puppet-editor_&]:[width:0.4375rem] [.puppet-editor_&]:[height:0.4375rem]',
    '[.puppet-editor_&]:[border-radius:62.4375rem] [.puppet-editor_&]:[background:var(--puppet-color-accent,#e5b55a)]',
    '[.puppet-editor_&]:[box-shadow:0_0_0_0.25rem_color-mix(in_srgb,var(--puppet-color-accent,#e5b55a' +
      ')_10%,transparent)]',
  ],
  'visually-hidden': [
    '[.puppet-editor_&]:fixed [.puppet-editor_&]:[inline-size:0.0625rem]',
    '[.puppet-editor_&]:[block-size:0.0625rem] [.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&]:[clip-path:inset(50%)] [.puppet-editor_&]:whitespace-nowrap',
  ],
}
