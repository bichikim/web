const parameterVisibility = '[.puppet-editor_&_.parameter-visibility-toggle'

export const parametersShortcuts = {
  'keyform-actions': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-nowrap [.puppet-editor_&]:min-w-max',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_>_button]:shrink-0',
    '[.puppet-editor_&_button]:py-editor-control [.puppet-editor_&_button]:px-editor-field',
    '[.puppet-editor_&_button]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)]',
    '[.puppet-editor_&_button]:[border-radius:0.375rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-secondary,#bfeee1)]',
    '[.puppet-editor_&_button]:[background:var(--puppet-color-control,#17211e)] ' +
      '[.puppet-editor_&_button]:text-editor-caption',
    '[.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button.danger]:[border-color:var(--puppet-color-error,#66403e)]',
    '[.puppet-editor_&_button.danger]:[color:var(--puppet-color-error,#ffc5c0)]',
    '[.puppet-editor_&_button.danger]:[background:var(--puppet-error-surface,#241817)]',
    '[.puppet-editor_&_button:disabled]:[opacity:0.42] [.puppet-editor_&_button:disabled]:cursor-not-allowed',
  ],
  'keyform-binding-row': [
    'grid min-w-0 editor-track-columns [border-top:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[&:has(.parameter-item[data-selected])]:bg-[var(--puppet-color-control,#17211e)]',
    '[&:has(.parameter-item[data-selected])]:border-t-[var(--puppet-color-accent,#3d5f56)]',
  ],
  'keyform-footer': [
    '[.puppet-editor_&]:flex-wrap [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between',
    '[.puppet-editor_&]:py-editor-control [.puppet-editor_&]:px-editor-group',
    '[.puppet-editor_&]:[border-top:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],

  'keyform-help': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)] ' +
      '[.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&]:[line-height:1.5]',
  ],
  'keyform-marker': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[top:50%] [.puppet-editor_&]:[width:0.875rem]',
    '[.puppet-editor_&]:[height:0.875rem] [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:[border:0.125rem_solid_var(--puppet-color-text-secondary,#b8f5e5)] ' +
      '[.puppet-editor_&]:[border-radius:0.125rem]',
    '[.puppet-editor_&]:[background:var(--puppet-color-accent,#64e5c4)] ' +
      '[.puppet-editor_&]:[transform:translate(-50%,_-50%)_rotate(45deg)]',
    '[.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&.draggable]:[cursor:ew-resize] [.puppet-editor_&.draggable]:touch-none',
    '[.puppet-editor_&.dragging]:[border-color:var(--puppet-color-accent,#fff0cf)] ' +
      '[.puppet-editor_&.dragging]:[background:var(--puppet-color-accent,#ffbd59)]',
    '[.puppet-editor_&_>_span]:absolute [.puppet-editor_&_>_span]:[top:1rem]',
    '[.puppet-editor_&_>_span]:[left:0.875rem] ' +
      '[.puppet-editor_&_>_span]:[color:var(--puppet-color-text-muted,#82908b)]',
    '[.puppet-editor_&_>_span]:font-editor-mono',
    '[.puppet-editor_&_>_span]:text-editor-micro',
    '[.puppet-editor_&_>_span]:[transform:rotate(-45deg)_translateX(-50%)]',
    "[.puppet-editor_&[aria-pressed='true']]:[border-color:var(--puppet-color-accent,#fff0cf)]",
    "[.puppet-editor_&[aria-pressed='true']]:[background:var(--puppet-color-accent,#ffbd59)]",
    "[.puppet-editor_&[aria-pressed='true']]:[box-shadow:0_0_0_0.1875rem_color-mix(in_srgb,var(--pupp" +
      'et-color-accent,#ffbd59)_18%,transparent)]',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#fff0cf)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:0.25rem]',
  ],
  'keyform-panel': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:min-h-0',
    '[.puppet-editor_&]:[grid-template-rows:auto_minmax(4.75rem,_1fr)_auto]',
    '[.puppet-editor_&]:[background:var(--puppet-color-panel,#111614)]',
  ],
  'keyform-parameter-heading': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#c5d0cc)] ' +
      '[.puppet-editor_&]:text-editor-caption [.puppet-editor_&]:font-bold',
    '[.puppet-editor_&]:[letter-spacing:0.08rem] [.puppet-editor_&]:[text-transform:uppercase]',
  ],
  'keyform-row-value': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:[grid-template-columns:minmax(0,_1fr)_4.5rem] [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:font-editor-mono',
    '[.puppet-editor_&]:text-editor-metadata [.puppet-editor_&]:whitespace-nowrap',
    '[.puppet-editor_&_input]:box-border [.puppet-editor_&_input]:w-full [.puppet-editor_&_input]:min-w-0',
    '[.puppet-editor_&_input]:py-editor-related [.puppet-editor_&_input]:px-editor-control',
    '[.puppet-editor_&_input]:[border:0.0625rem_solid_var(--puppet-color-border,#3b4743)]',
    '[.puppet-editor_&_input]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&_input]:[color:var(--puppet-color-text,#e5eeea)]',
    '[.puppet-editor_&_input]:[background:var(--puppet-color-control,#171e1b)] ' +
      '[.puppet-editor_&_input]:[font:inherit]',
  ],
  'keyform-row-values': ['[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-related'],
  'keyform-toolbar': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:overflow-x-auto',
    '[.puppet-editor_&]:[container-type:inline-size] [.puppet-editor_&]:[container-name:keyform-toolbar]',
    [
      '[@container_keyform-toolbar_(max-width:_60rem)]:',
      '[.puppet-editor_&_.editor-segmented-field_button:has(>_.puppet-icon)_.editor-segmented-label]:hidden',
    ].join(''),
    '[.puppet-editor_&]:[min-height:2.8125rem]',
    '[.puppet-editor_&]:[grid-template-columns:minmax(max-content,_16.875rem)_minmax(max-content,_1fr)]',
    '[.puppet-editor_&]:gap-editor-group',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:py-editor-field [.puppet-editor_&]:px-editor-group',
    '[.puppet-editor_&]:[border-bottom:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],
  'keyform-track': [
    '[.puppet-editor_&]:relative [.puppet-editor_&]:[min-width:10rem] [.puppet-editor_&]:[min-height:4.75rem]',
    '[.puppet-editor_&]:[margin:0_1.75rem]',
    '[.puppet-editor_&]:[background-image:linear-gradient(to_right,_var(--puppet-color-divider,#27322e)_' +
      '0.0625rem,_transparent_0.0625rem)]',
    '[.puppet-editor_&]:[background-size:12.5%_100%] [.puppet-editor_&]:[cursor:crosshair]',
    '[.puppet-editor_&]:touch-none',
    '[.puppet-editor_&::before]:absolute [.puppet-editor_&::before]:[top:50%]',
    '[.puppet-editor_&::before]:[right:0] [.puppet-editor_&::before]:[left:0]',
    '[.puppet-editor_&::before]:[height:0.0625rem] ' +
      '[.puppet-editor_&::before]:[background:var(--puppet-color-border,#3a4642)]',
    "[.puppet-editor_&::before]:[content:'']",
  ],
  'keyform-track-label': [
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:[min-height:4.75rem]',
    '[.puppet-editor_&_.parameter-item-surface]:[border-right:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_.parameter-item-surface]:[border-bottom:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_.parameter-item-surface]:[border-radius:0]',
    '[.puppet-editor_&_.parameter-item-surface]:overflow-hidden',
    '[.puppet-editor_&.parameter-grid-label]:[min-height:7.75rem]',
    '[.puppet-editor_&_.parameter-swipe-row]:[min-height:4.75rem]',
    '[.puppet-editor_&_.parameter-swipe-row]:[border-radius:0]',
    '[.puppet-editor_&_.parameter-item]:[min-height:4.75rem]',
    '[.puppet-editor_&_.parameter-item]:[border-radius:0]',
    '[.puppet-editor_&_.parameter-item]:pb-editor-field',
    '[.puppet-editor_&_.parameter-item]:pr-editor-field',
    '[.puppet-editor_&_.parameter-item]:[grid-template-rows:auto_1fr]',
    '[.puppet-editor_&_.parameter-name-values]:row-start-2',
    '[.puppet-editor_&_.parameter-value-control]:w-22',
    '[.puppet-editor_&_.parameter-item]:[border-width:0]',
    '[.puppet-editor_&_.parameter-item[data-selected]]:bg-[var(--puppet-color-selected,#1a2925)]',
    '[.puppet-editor_&_.parameter-item[data-selected]]:[box-shadow:inset_0.1875rem_0_0_var(--puppet-color-' +
      'accent,#64e5c4)]',
    '[.puppet-editor_&_.parameter-item[data-selected]_strong]:text-[var(--puppet-color-text,#e8f0ed)]',
    '[.puppet-editor_&.parameter-grid-label_.parameter-swipe-row]:[min-height:7.75rem]',
    '[.puppet-editor_&.parameter-grid-label_.parameter-item]:[min-height:7.75rem]',
    '[.puppet-editor_&.parameter-volume-label]:[min-height:15.5rem] [.puppet-editor_&.parameter-volume-label]:grid',
    '[.puppet-editor_&.parameter-volume-label_.parameter-swipe-row]:[min-height:12.5rem]',
    '[.puppet-editor_&.parameter-volume-label_.parameter-item]:[min-height:12.5rem]',
    '[.puppet-editor_&.parameter-volume-label_.parameter-swipe-row]:h-full',
    '[.puppet-editor_&.parameter-volume-label_.parameter-item-surface]:h-full',
    '[.puppet-editor_&.parameter-volume-label_.parameter-item-main]:h-full',
    '[.puppet-editor_&.parameter-volume-label_.parameter-item]:h-full',
  ],
  'keyform-track-labels': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[align-content:start] [grid-column:1] [grid-row:1_/_3]',
  ],
  'keyform-track-scroll': [
    '[.puppet-editor_&]:box-border [.puppet-editor_&]:[border-bottom:0.0625rem_solid_var(--puppet-color-bo' +
      'rder,#35413d)]',
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:overflow-x-auto',
    '[.puppet-editor_&]:[grid-column:2] [.puppet-editor_&]:[grid-row:1_/_3]',
  ],
  'keyform-track-wrap': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:min-h-0',

    '[.puppet-editor_&]:[align-content:start] [.puppet-editor_&]:[overflow-x:hidden]',
    '[.puppet-editor_&]:overflow-y-auto',
  ],
  'keyform-tracks': [
    '[.puppet-editor_&]:h-full [.puppet-editor_&]:[grid-template-rows:1fr]',
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[align-content:start]',
    '[.puppet-editor_&]:[min-width:13.5rem]',
  ],
  'keyform-value-indicator': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[top:0] [.puppet-editor_&]:[bottom:0]',
    '[.puppet-editor_&]:[width:0.6875rem] [.puppet-editor_&]:p-0 [.puppet-editor_&]:[border:0]',
    '[.puppet-editor_&]:editor-parameter-marker',
    '[.puppet-editor_&]:[transform:translateX(-50%)] [.puppet-editor_&]:[cursor:ew-resize]',
    '[.puppet-editor_&]:touch-none',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#fff0cf)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:-0.125rem]',
  ],
  'keyform-volume-track': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[grid-template-rows:minmax(12.5rem,_auto)_3rem]',
    '[.puppet-editor_&]:[border-left:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_.parameter-volume-track]:bg-none',
    '[.puppet-editor_&_.keyform-track:not(.parameter-volume-track)]:[border-top:0.0625rem_solid_var(--pupp' +
      'et-color-divider,#27302d)]',
  ],
  'parameter-binding-name': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:break-words [.puppet-editor_&]:text-editor-body',
    '[.puppet-editor_&]:font-medium [.puppet-editor_&]:text-[var(--puppet-color-text,#dfe8e4)]',
  ],
  'parameter-editor': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:mt-editor-section',
    '[.puppet-editor_&]:pt-editor-section ' +
      '[.puppet-editor_&]:[border-top:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
    '[.puppet-editor_&_label]:grid [.puppet-editor_&_label]:[grid-template-columns:4.625rem_minmax(0,_1fr)]',
    '[.puppet-editor_&_label]:gap-editor-field [.puppet-editor_&_label]:items-center',
    '[.puppet-editor_&_label]:[color:var(--puppet-color-text-muted,#84918c)] ' +
      '[.puppet-editor_&_label]:text-editor-caption',
    "[.puppet-editor_&_input[type='number']]:min-w-0",
    "[.puppet-editor_&_input[type='number']]:py-editor-control " +
      "[.puppet-editor_&_input[type='number']]:px-editor-field",
    "[.puppet-editor_&_input[type='number']]:[border:0.0625rem_solid_var(--puppet-color-border,#3b4743)]",
    "[.puppet-editor_&_input[type='number']]:[border-radius:0.375rem]",
    "[.puppet-editor_&_input[type='number']]:[color:var(--puppet-color-text,#e5eeea)]",
    "[.puppet-editor_&_input[type='number']]:[background:var(--puppet-color-control,#171e1b)]",
    '[.puppet-editor_&_input:not([type])]:min-w-0',
    '[.puppet-editor_&_input:not([type])]:py-editor-control [.puppet-editor_&_input:not([type])]:px-editor-field',
    '[.puppet-editor_&_input:not([type])]:[border:0.0625rem_solid_var(--puppet-color-border,#3b4743)]',
    '[.puppet-editor_&_input:not([type])]:[border-radius:0.375rem]',
    '[.puppet-editor_&_input:not([type])]:[color:var(--puppet-color-text,#e5eeea)]',
    '[.puppet-editor_&_input:not([type])]:[background:var(--puppet-color-control,#171e1b)]',
    "[.puppet-editor_&_input[type='range']]:w-full",
    "[.puppet-editor_&_input[type='range']]:[accent-color:var(--puppet-color-accent,#64e5c4)]",
  ],
  'parameter-grid': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[inset:1rem_0] [.puppet-editor_&]:[cursor:crosshair]',
    '[.puppet-editor_&]:touch-none',
  ],
  'parameter-grid-current-x': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[background:var(--puppet-color-accent,#ffbd59)] ' +
      '[.puppet-editor_&]:pointer-events-none',
    '[.puppet-editor_&]:[top:-1rem] [.puppet-editor_&]:[bottom:-1rem] [.puppet-editor_&]:[width:0.0625rem]',
    '[.puppet-editor_&]:[transform:translateX(-50%)]',
  ],
  'parameter-grid-current-y': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[background:var(--puppet-color-accent,#ffbd59)] ' +
      '[.puppet-editor_&]:pointer-events-none',
    '[.puppet-editor_&]:[right:0] [.puppet-editor_&]:[left:0] [.puppet-editor_&]:[height:0.0625rem]',
    '[.puppet-editor_&]:[transform:translateY(50%)]',
  ],
  'parameter-grid-keyform': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[width:0.875rem] [.puppet-editor_&]:[height:0.875rem]',
    '[.puppet-editor_&]:p-0 [.puppet-editor_&]:[border:0.125rem_solid_var(--puppet-color-text-secondary,#b8f5e5)]',
    '[.puppet-editor_&]:[border-radius:0.125rem] [.puppet-editor_&]:[background:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&]:[transform:translate(-50%,_50%)_rotate(45deg)] [.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&.selected]:[border-color:var(--puppet-color-accent,#fff0cf)] ' +
      '[.puppet-editor_&.selected]:[background:var(--puppet-color-accent,#ffbd59)]',
    '[.puppet-editor_&.selected]:[box-shadow:0_0_0_0.1875rem_color-mix(in_srgb,var(--puppet-color-acc' +
      'ent,#ffbd59)_18%,transparent)]',
  ],
  'parameter-grid-scale-x': [
    '[&.parameter-track-scale_span]:top-[calc(100%_+_0.75rem)]',
    "[&_span]:before:content-[''] [&_span]:before:absolute [&_span]:before:top-[-0.75rem]",
    '[&_span]:before:left-1/2 [&_span]:before:w-px [&_span]:before:h-1 ' +
      '[&_span]:before:bg-[var(--puppet-color-text-muted,#84918c)]',
  ],
  'parameter-grid-scale-y': [
    '[&.parameter-track-scale_span]:left-auto [&.parameter-track-scale_span]:top-auto',
    '[&.parameter-track-scale_span]:bottom-[var(--scale-progress)]',
    '[&.parameter-track-scale_span]:right-[calc(100%_+_0.6875rem)]',
    '[&.parameter-track-scale_span]:px-0 [&.parameter-track-scale_span]:[transform:translateY(50%)]',
    "[&_span]:before:content-[''] [&_span]:before:absolute [&_span]:before:top-1/2",
    '[&_span]:before:right-[-0.6875rem] [&_span]:before:w-1 [&_span]:before:h-px',
    '[&_span]:before:bg-[var(--puppet-color-text-muted,#84918c)]',
  ],
  'parameter-grid-track': [
    '[.puppet-editor_&]:[min-height:7.75rem]',
    '[.puppet-editor_&::before]:hidden',
    '[.puppet-editor_&:not(.parameter-volume-track)]:ml-8',
  ],
  'parameter-grid-with-scale': [
    '[.puppet-editor_&]:[inset:1rem_0_1.5rem]',
    '[.puppet-editor_&]:[background-image:linear-gradient(to_top,_var(--puppet-color-divider,#27322e)_' +
      '0.0625rem,_transparent_0.0625rem)]',
    '[.puppet-editor_&]:[background-size:100%_25%]',
    '[.puppet-editor_&]:[outline:0.0625rem_solid_var(--puppet-color-border,#3a4642)]',
    '[.puppet-editor_&_.parameter-grid-current-x]:[bottom:-1.5rem]',
  ],
  'parameter-header-select': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:inset-0 [.puppet-editor_&]:m-0 [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:border-0 [.puppet-editor_&]:rounded-inherit [.puppet-editor_&]:bg-transparent',
    '[.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:-0.125rem]',
  ],
  'parameter-influence-status': [
    'editor-type-metadata text-[var(--puppet-color-text-secondary,#b9c5c0)] whitespace-nowrap',
  ],
  'parameter-inspector': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&_>_.deformer-properties]:mt-0',
  ],
  'parameter-item': [
    '[.puppet-editor_&]:relative [.puppet-editor_&]:grid [.puppet-editor_&]:w-full',
    '[.puppet-editor_&]:gap-editor-related [.puppet-editor_&]:py-editor-field [.puppet-editor_&]:pr-[1.875rem]',
    '[.puppet-editor_&]:pl-editor-field',
    '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#313b37)] ' +
      '[.puppet-editor_&]:[border-radius:0.4375rem]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#a7b3af)] ' +
      '[.puppet-editor_&]:[background:var(--puppet-color-input,#121916)]',
    '[.puppet-editor_&]:text-left',

    '[.puppet-editor_&]:[transition:transform_160ms_ease-out] [.puppet-editor_&]:select-none',
    '[.puppet-editor_&[data-selected]]:[border-color:var(--puppet-color-border,#4a776b)]',
    '[.puppet-editor_&[data-selected]]:[color:var(--puppet-color-text,#f3f7f5)]',
    '[.puppet-editor_&[data-selected]]:[background:var(--puppet-color-control,#17211e)]',
    '[.puppet-editor_&_strong]:text-editor-body',
    '[.puppet-editor_&_small]:[color:var(--puppet-color-text-muted,#8f9d98)]',
    '[.puppet-editor_&_small]:font-editor-mono',
    '[.puppet-editor_&_small]:text-editor-metadata',
  ],
  'parameter-item-details': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[right:1.875rem] [.puppet-editor_&]:bottom-editor-field',
    '[.puppet-editor_&]:left-editor-field [.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#a7b3af)]',

    '[.puppet-editor_&]:[transition:transform_160ms_ease-out]',
  ],
  'parameter-item-heading': [
    'grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-editor-related min-w-0 pl-editor-reading',
    '[&_small]:truncate',
  ],
  'parameter-item-main': 'relative',
  'parameter-item-surface': [
    '[&:has(.parameter-item[data-selected])]:bg-[var(--puppet-color-control,#17211e)]',
    'relative bg-[var(--puppet-color-input,#121916)] [transform:translateX(var(--parameter-swipe-offset))]',
    '[transition:transform_160ms_ease-out] [.dragging_&]:transition-none',
  ],
  'parameter-line-label': [
    '[.puppet-editor_&.keyform-track-label]:[min-height:3rem]',
    '[.puppet-editor_&.keyform-track-label_.parameter-swipe-row]:[min-height:3rem]',
    '[.puppet-editor_&.keyform-track-label_.parameter-item]:[min-height:3rem]',
    '[.puppet-editor_&.keyform-track-label_.parameter-item]:py-editor-related',
  ],
  'parameter-line-track': [
    '[.puppet-editor_&_.keyform-marker_>_span]:[transform-origin:0_0]',
    '[.puppet-editor_&.keyform-track]:[min-height:3rem]',
  ],
  'parameter-list': ['[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-control'],
  'parameter-name-control': [
    'relative',
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:border-0 [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:[color:inherit] [.puppet-editor_&]:bg-transparent',
    '[.puppet-editor_&]:cursor-pointer [.puppet-editor_&]:text-left',
    '[.puppet-editor_&_strong]:block [.puppet-editor_&_strong]:overflow-hidden',
    '[.puppet-editor_&_strong]:[text-overflow:ellipsis] [.puppet-editor_&_strong]:whitespace-nowrap',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:0.125rem]',
  ],
  'parameter-name-editor': [
    'relative',
    '[.puppet-editor_&]:[min-height:3rem] [.puppet-editor_&]:[align-content:center]',
    '[.puppet-editor_&_input]:w-full [.puppet-editor_&_input]:min-w-0',
    '[.puppet-editor_&_input]:py-editor-related [.puppet-editor_&_input]:px-editor-field',
    '[.puppet-editor_&_input]:[border:0.0625rem_solid_var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_input]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&_input]:[color:var(--puppet-color-text,#f3f7f5)]',
    '[.puppet-editor_&_input]:[background:var(--puppet-color-control,#171e1b)] ' +
      '[.puppet-editor_&_input]:text-editor-body',
    '[.puppet-editor_&_input]:font-bold',
    '[.puppet-editor_&_input:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_input:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'parameter-name-row':
    'grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-editor-field min-w-0',
  'parameter-name-values': 'grid gap-editor-related min-w-0 self-end',
  'parameter-properties': [
    '[.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&_button.influence-toggle]:justify-between',
    '[.puppet-editor_&_button.influence-toggle]:px-0',
  ],
  'parameter-range': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:justify-between ' +
      '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#6f7d78)]',
    '[.puppet-editor_&]:font-editor-mono',
    '[.puppet-editor_&]:text-editor-metadata',
  ],
  'parameter-section-summary': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:break-words [.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&]:leading-normal [.puppet-editor_&]:text-[var(--puppet-color-text-secondary,#a9bdb5)]',
  ],
  'parameter-settings-toggles': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[grid-template-columns:1fr_1fr]',
    '[.puppet-editor_&]:[grid-column:1] [.puppet-editor_&]:[grid-row:2]',
    '[.puppet-editor_&_>_.influence-toggle]:[grid-column:auto] ' +
      '[.puppet-editor_&_>_.influence-toggle]:[grid-row:auto]',
  ],
  'parameter-swipe-delete': [
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[top:0] [.puppet-editor_&]:[left:0]',
    '[.puppet-editor_&]:[bottom:0] [.puppet-editor_&]:grid [.puppet-editor_&]:[width:5rem]',
    '[.puppet-editor_&]:gap-editor-tight [.puppet-editor_&]:[align-content:center]',
    '[.puppet-editor_&]:[justify-items:center] [.puppet-editor_&]:[color:var(--puppet-color-error,#f3aaa5)]',
    '[.puppet-editor_&]:[background:var(--puppet-error-surface,#471f1d)] [.puppet-editor_&]:text-editor-micro',
    '[.puppet-editor_&]:font-bold',
    '[.puppet-editor_&_.puppet-icon]:[width:1rem] [.puppet-editor_&_.puppet-icon]:[height:1rem]',
  ],
  'parameter-swipe-hint': [
    'pointer-events-none',
    '[.puppet-editor_&]:absolute [.puppet-editor_&]:[top:0.625rem] [.puppet-editor_&]:left-editor-field',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-muted,#596762)] [.puppet-editor_&]:text-editor-reading',
  ],
  'parameter-swipe-row': [
    '[.puppet-editor_&]:relative [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:[border-radius:0.4375rem]',
    '[.puppet-editor_&]:overflow-hidden [.puppet-editor_&]:[background:var(--puppet-error-surface,#351918)]',
    '[.puppet-editor_&]:[touch-action:pan-y]',
    '[.puppet-editor_&.armed_.parameter-swipe-delete]:[color:var(--puppet-color-text,#fff1ef)]',
    '[.puppet-editor_&.armed_.parameter-swipe-delete]:[background:var(--puppet-error-active-surface,#a63f3a)]',
    '[.puppet-editor_&.dragging_.parameter-item]:cursor-grabbing',
    '[.puppet-editor_&.dragging_.parameter-item]:[transition:none]',
    '[.puppet-editor_&.dragging_.parameter-item-details]:[transition:none]',
  ],
  'parameter-target-actions': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-wrap [.puppet-editor_&]:gap-editor-control',
    '[.puppet-editor_&_button]:py-editor-related [.puppet-editor_&_button]:px-editor-field',
    '[.puppet-editor_&_button]:[border:0.0625rem_solid_var(--puppet-color-accent,#3d5f56)]',
    '[.puppet-editor_&_button]:[border-radius:0.375rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-secondary,#bfeee1)]',
    '[.puppet-editor_&_button]:[background:var(--puppet-color-control,#17211e)] ' +
      '[.puppet-editor_&_button]:text-editor-metadata',
    '[.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button:disabled]:[border-color:var(--puppet-color-border,#5b6e67)]',
    '[.puppet-editor_&_button:disabled]:[color:var(--puppet-color-text-muted,#84918c)] ' +
      '[.puppet-editor_&_button:disabled]:[background:var(--puppet-color-input,#121816)]',
    '[.puppet-editor_&_button:disabled]:cursor-not-allowed',
    `${parameterVisibility}[aria-pressed='true']]:[border-color:var(--puppet-color-accent,#64e5c4)]`,
    `${parameterVisibility}[aria-pressed='true']]:[color:var(--puppet-color-text-secondary,#bfeee1)]`,
    `${parameterVisibility}[aria-pressed='true']]:[background:var(--puppet-color-selected,#1a2925)]`,
    `${parameterVisibility}[aria-pressed='false']]:[border-color:var(--puppet-color-border,#5b6e67)]`,
    `${parameterVisibility}[aria-pressed='false']]:[color:var(--puppet-color-text-muted,#84918c)]`,
    `${parameterVisibility}[aria-pressed='false']]:[background:var(--puppet-color-input,#121816)]`,
    `${parameterVisibility}:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#64e5c4)]`,
    `${parameterVisibility}:focus-visible]:[outline-offset:0.125rem]`,
  ],
  'parameter-target-editor': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-field [.puppet-editor_&]:mt-editor-control',
    '[.puppet-editor_&]:pt-editor-group ' +
      '[.puppet-editor_&]:[border-top:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
    '[.puppet-editor_&_p]:m-0 [.puppet-editor_&_p]:[color:var(--puppet-color-text-muted,#788580)] ' +
      '[.puppet-editor_&_p]:text-editor-metadata',
    '[.puppet-editor_&_p]:[line-height:1.5]',
  ],
  'parameter-target-heading': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#c6d2cd)] [.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&_span]:[color:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_span]:font-editor-mono',
  ],
  'parameter-target-list': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-wrap [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:p-0 [.puppet-editor_&]:[list-style:none]',
    '[.puppet-editor_&_li]:py-editor-related [.puppet-editor_&_li]:px-editor-control',
    '[.puppet-editor_&_li]:[border:0.0625rem_solid_var(--puppet-color-border,#35564e)]',
    '[.puppet-editor_&_li]:[border-radius:62.4375rem] ' +
      '[.puppet-editor_&_li]:[color:var(--puppet-color-text-secondary,#bfeee1)]',
    '[.puppet-editor_&_li]:[background:var(--puppet-color-control,#17211e)] ' +
      '[.puppet-editor_&_li]:text-editor-metadata',
  ],
  'parameter-track-scale': [
    'absolute inset-0 pointer-events-none text-[var(--puppet-color-text-secondary,#b9c5c0)] ' +
      'font-editor-mono text-editor-caption leading-none',
    '[&_span]:absolute [&_span]:left-[var(--scale-progress)]',
    '[&_span]:top-[calc(50%_+_0.75rem)] [&_span]:[transform:translateX(-50%)]',
    '[&_span]:bg-[var(--puppet-color-panel,#111614)] [&_span]:px-px',
  ],
  'parameter-value-control': 'relative w-[7rem] min-w-0 [&_.editor-number-field]:w-full',
  'parameter-volume-scale': [
    '[&.parameter-volume-scale_text]:[font-size:7.5px]',
    '[&.parameter-volume-scale_text]:[text-anchor:middle]',
    '[&.parameter-volume-scale_text]:[paint-order:stroke] ' +
      '[&.parameter-volume-scale_text]:stroke-[var(--puppet-color-panel,#111614)]',
    '[&.parameter-volume-scale_text]:[stroke-width:2px] [&.parameter-volume-scale_text]:[stroke-linejoin:round]',
    '[&.parameter-volume-scale_line]:stroke-[var(--puppet-color-text-muted,#84918c)]',
  ],
  'parameter-volume-scale-y': '[&.parameter-volume-scale-y_text]:[text-anchor:end]',
  'parameter-volume-slice': [
    '[.puppet-editor_&]:[inset:auto]',
    '[.puppet-editor_&]:[left:var(--volume-left)] [.puppet-editor_&]:[top:var(--volume-top)]',
    '[.puppet-editor_&]:w-[var(--volume-width)] [.puppet-editor_&]:h-[var(--volume-height)]',
    '[&_.parameter-grid-current-x]:[top:0] [&_.parameter-grid-current-x]:[bottom:0]',
    '[&_.parameter-grid-current-y]:[left:0] [&_.parameter-grid-current-y]:[right:0]',
  ],
  'parameter-volume-space': [
    'absolute inset-0 w-full h-full pointer-events-none overflow-visible',
    '[&_line]:stroke-[var(--puppet-color-border,#52655c)] [&_line]:[stroke-width:0.8]',
    '[&_circle]:fill-[var(--puppet-color-text-muted,#84918c)] [&_circle]:opacity-40',
    '[&_polygon]:fill-[var(--puppet-color-accent,#64e5c4)] [&_polygon]:fill-opacity-5 ' +
      '[&_polygon]:stroke-[var(--puppet-color-accent,#64e5c4)]',
    '[&_polygon]:[stroke-width:0.8]',
    '[&_text]:fill-[var(--puppet-color-text-secondary,#b9c5c0)] [&_text]:text-editor-micro [&_text]:font-editor-mono',
  ],
  'parameter-volume-stage': 'relative mx-auto w-[min(100%,22rem)] aspect-[13/7]',
  'parameter-volume-track': [
    '[.puppet-editor_&]:min-h-0 [.puppet-editor_&]:grid [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:py-editor-related [.puppet-editor_&::before]:hidden',
  ],
  'puppet-layer-parameter-links': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&_span]:py-editor-tight [.puppet-editor_&_span]:px-editor-related',
    '[.puppet-editor_&_span]:overflow-hidden',
    '[.puppet-editor_&_span]:[border-radius:62.4375rem] [.puppet-editor_&_span]:editor-accent-tag',
    '[.puppet-editor_&_span]:text-editor-micro',
    '[.puppet-editor_&_span]:[text-overflow:ellipsis] [.puppet-editor_&_span]:whitespace-nowrap',
  ],
}
