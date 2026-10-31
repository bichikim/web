const selectedLayerRow =
  "[.puppet-editor_&[aria-selected='true']_>_.layer-tree-node_>_.editor-context-menu-trigger_>_.layer-row]"

export const layersShortcuts = {
  'container-kind-trigger': [
    'relative flex shrink-0 items-center justify-center gap-editor-tight py-0 pl-0 pr-editor-related rounded-lg',
    'border border-solid border-transparent bg-transparent cursor-pointer',
    'hover:bg-[var(--puppet-color-selected,#25382f)] ' +
      'hover:border-[var(--puppet-color-text-muted,#4c6e61)] focus-visible:outline ' +
      'focus-visible:outline-[var(--puppet-color-accent,#64e5c4)]',
    '[&[data-expanded]]:bg-[var(--puppet-color-selected,#254c40)] ' +
      '[&[data-expanded]]:border-[var(--puppet-color-accent,#64e5c4)]',
    '[&[data-expanded]:hover]:bg-[var(--puppet-color-selected,#254c40)] ' +
      '[&[data-expanded]:hover]:border-[var(--puppet-color-accent,#64e5c4)]',
    '[&[data-expanded]]:shadow-[0_0_0_2px_color-mix(in_srgb,var(--puppet-color-accent,#64e5c4)_15%,transpar' +
      'ent)] [&:disabled]:opacity-40',
  ],
  'kind-check': 'text-[var(--puppet-color-accent,#75e5be)] inline-flex',
  'kind-chevron': [
    'shrink-0 w-3 h-3 text-[var(--puppet-color-text-secondary,#c1d8cc)]',
    '[.container-kind-trigger[data-expanded]_&]:[transform:rotate(180deg)]',
  ],
  'kind-menu': [
    'editor-type-root',
    'w-56 p-editor-control rounded-xl border border-solid border-[var(--puppet-color-border,#3b5147)] ' +
      'bg-[var(--puppet-color-control,#151e19)] text-[var(--puppet-color-text,#e1ebe6)] outline-none',
    'shadow-[0_12px_32px_color-mix(in_srgb,var(--puppet-color-shadow,#000000)_53.333%,transparent)] ' +
      '[&[data-closed]]:hidden',
    '[&_.puppet-layer-container-icon]:w-5 [&_.puppet-layer-container-icon]:h-5',
  ],
  'kind-menu-heading':
    'block px-editor-field py-editor-control text-editor-caption font-semibold ' +
    'text-[var(--puppet-color-text-secondary,#98afa3)]',
  'kind-menu-item': [
    'grid grid-cols-[1.25rem_1fr_1rem] items-center gap-editor-field px-editor-field py-editor-field rounded-md',
    'text-editor-body outline-none cursor-pointer',
    '[&[data-checked]]:bg-[var(--puppet-color-selected,#233c30)] ' +
      '[&[data-checked]]:text-[var(--puppet-color-text-secondary,#a4f3d9)]',
    '[&[data-highlighted]]:bg-[var(--puppet-color-hover,#355946)] ' +
      '[&[data-highlighted]]:text-[var(--puppet-color-text,#ffffff)]',
  ],
  'kind-menu-note':
    'm-0 px-editor-field py-editor-control text-editor-caption leading-relaxed ' +
    'text-[var(--puppet-color-text-secondary,#a1b3a8)]',
  'layer-count': [
    '[.puppet-editor_&]:ml-auto [.puppet-editor_&]:self-center [.puppet-editor_&]:grid',
    '[.puppet-editor_&]:[min-width:1.375rem] [.puppet-editor_&]:[height:1.75rem] [.puppet-editor_&]:box-border',
    '[.puppet-editor_&]:place-items-center ' +
      '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#313b37)]',
    '[.puppet-editor_&]:[border-radius:0.375rem] [.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&]:text-editor-caption',
  ],
  'layer-filter': [
    'flex min-w-0 items-center gap-editor-control pb-editor-field',
    '[&_.layer-filter-input]:min-w-0 [&_.layer-filter-input]:flex-1',
    '[&_.editor-text-input]:min-w-0 [&_.editor-text-input]:w-full',
    '[&_.editor-text-input]:border [&_.editor-text-input]:border-solid ' +
      '[&_.editor-text-input]:border-[var(--puppet-color-border,#35413d)]',
    '[&_.editor-text-input]:rounded-md [&_.editor-text-input]:bg-[var(--puppet-color-input,#121816)] ' +
      '[&_.editor-text-input]:text-[var(--puppet-color-text,#edf4f0)]',
    '[&_.editor-text-input::placeholder]:text-[var(--puppet-color-text-muted,#84918c)]',
    '[&_.editor-text-input:focus-visible]:outline ' +
      '[&_.editor-text-input:focus-visible]:outline-[var(--puppet-color-accent,#64e5c4)]',
  ],
  'layer-kind-badge': [
    'editor-accent-tag inline-block mr-editor-related px-editor-related rounded-sm',
    'font-semibold',
  ],
  'layer-label': [
    '[.puppet-editor_&]:flex-1',
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-tight',
    '[.puppet-editor_&_strong]:overflow-hidden [.puppet-editor_&_strong]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_strong]:whitespace-nowrap',
    '[.puppet-editor_&_small]:overflow-hidden [.puppet-editor_&_small]:[text-overflow:ellipsis]',
    '[.puppet-editor_&_small]:whitespace-nowrap',
    '[.puppet-editor_&_strong]:text-editor-body',
    '[.puppet-editor_&_small]:[color:var(--puppet-color-text-muted,#8f9d98)] ' +
      '[.puppet-editor_&_small]:text-editor-metadata',
  ],
  'layer-name': [
    '[.puppet-editor_&]:block [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&]:whitespace-nowrap',
    '[.puppet-editor_&_.layer-name-track]:block',
    '[.puppet-editor_&_.layer-name-track_>_span]:block',
    '[.puppet-editor_&_.layer-name-track_>_span]:overflow-hidden',
    '[.puppet-editor_&_.layer-name-track_>_span]:text-ellipsis',
    '[.puppet-editor_&_.layer-name-track_>_.layer-name-copy]:hidden',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track]:flex',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track]:w-max',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track]:animate-layer-name',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track_>_span]:shrink-0',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track_>_span]:mr-8',
    '[.puppet-editor_&[data-scrolling]_.layer-name-track_>_.layer-name-copy]:block',
    'motion-reduce:[.puppet-editor_&[data-scrolling]_.layer-name-track]:animate-none',
    'motion-reduce:[.puppet-editor_&[data-scrolling]_.layer-name-track]:block',
    'motion-reduce:[.puppet-editor_&[data-scrolling]_.layer-name-track]:w-auto',
    'motion-reduce:[.puppet-editor_&[data-scrolling]_.layer-name-track_>_span]:mr-0',
    'motion-reduce:[.puppet-editor_&[data-scrolling]_.layer-name-track_>_.layer-name-copy]:hidden',
  ],
  'layer-row': [
    '[.puppet-editor_&]:[min-width:calc(16rem_+_var(--layer-depth)_*_0.875rem)]',
    '[.puppet-editor_&]:[max-width:calc(20rem_+_var(--layer-depth)_*_0.875rem)]',
    '[.puppet-editor_&]:relative [.puppet-editor_&]:grid',
    '[.puppet-editor_&]:[grid-template-columns:1rem_minmax(0,_1fr)_auto] [.puppet-editor_&]:gap-editor-tight',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:[padding-left:calc(var(--layer-depth)_*_0.875rem)]',
    '[.puppet-editor_&]:[border:0.0625rem_solid_transparent] [.puppet-editor_&]:[border-radius:0.4375rem]',
    '[.puppet-editor_&.drop-before::before]:absolute [.puppet-editor_&.drop-before::before]:[right:0.25rem]',
    '[.puppet-editor_&.drop-before::before]:[left:calc(var(--layer-depth)_*_0.875rem_+_0.25rem)]',
    '[.puppet-editor_&.drop-before::before]:[height:0.125rem]',
    '[.puppet-editor_&.drop-before::before]:[border-radius:62.4375rem]',
    '[.puppet-editor_&.drop-before::before]:[background:var(--puppet-color-accent,#e5b55a)]',
    "[.puppet-editor_&.drop-before::before]:[content:'']",
    '[.puppet-editor_&.drop-after::after]:absolute [.puppet-editor_&.drop-after::after]:[right:0.25rem]',
    '[.puppet-editor_&.drop-after::after]:[left:calc(var(--layer-depth)_*_0.875rem_+_0.25rem)]',
    '[.puppet-editor_&.drop-after::after]:[height:0.125rem]',
    '[.puppet-editor_&.drop-after::after]:[border-radius:62.4375rem]',
    '[.puppet-editor_&.drop-after::after]:[background:var(--puppet-color-accent,#e5b55a)]',
    "[.puppet-editor_&.drop-after::after]:[content:'']",
    '[.puppet-editor_&.drop-before::before]:[top:-0.1875rem]',
    '[.puppet-editor_&.drop-after::after]:[bottom:-0.1875rem]',
    '[.puppet-editor_&.drop-inside]:[border-color:var(--puppet-color-accent,#e5b55a)] ' +
      '[.puppet-editor_&.drop-inside]:[background:var(--puppet-color-selected,#2b2618)]',
  ],
  'layer-scroll': [
    '[.puppet-editor_&]:min-h-0 [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:flex-1',
    '[.puppet-editor_&]:overflow-auto',
  ],
  'layer-select': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:py-editor-control [.puppet-editor_&]:px-editor-related',
    '[.puppet-editor_&]:[border:0] [.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#a7b3af)]',
    '[.puppet-editor_&]:[background:transparent] [.puppet-editor_&]:cursor-pointer [.puppet-editor_&]:text-left',
    "[.puppet-editor_&[aria-pressed='true']]:[color:var(--puppet-color-text,#f3f7f5)]",
    '[.puppet-editor_&.mask-pick-candidate]:[border-radius:0.375rem]',
    '[.puppet-editor_&.mask-pick-candidate]:[color:var(--puppet-color-text,#d7fff4)]',
    '[.puppet-editor_&.mask-pick-candidate]:[background:var(--puppet-color-selected,#17352d)]',
    '[.puppet-editor_&.mask-pick-candidate]:[box-shadow:inset_0_0_0_0.0625rem_var(--puppet-color-accent,#4fcaa9)]',
    '[.puppet-editor_&:disabled]:[opacity:0.35] [.puppet-editor_&:disabled]:cursor-not-allowed',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#61e3c1)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'layer-statistics': [
    '[.puppet-editor_&]:text-right [.puppet-editor_&]:pt-editor-field',
    '[.puppet-editor_&]:[border-top:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
    '[.puppet-editor_&]:text-editor-caption [.puppet-editor_&]:[color:var(--puppet-color-text-muted,#84918c)]',
  ],
  'layer-thumbnail': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[width:2.375rem] [.puppet-editor_&]:[height:2.375rem]',
    '[.puppet-editor_&]:[flex:none] [.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#4c615a)]',
    '[.puppet-editor_&]:[border-radius:0.375rem]',
    '[.puppet-editor_&]:editor-checkerboard',
    '[.puppet-editor_&]:[background-position:0_0,_0_0.5rem,_0.5rem_-0.5rem,_-0.5rem_0]',
    '[.puppet-editor_&]:[background-size:1rem_1rem] [.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&]:place-items-center',
    '[.puppet-editor_&_img]:block [.puppet-editor_&_img]:w-full [.puppet-editor_&_img]:h-full',
    '[.puppet-editor_&_img]:[object-fit:contain]',
  ],
  'layer-toolbar': [
    '[.puppet-editor_&_button]:box-border [.puppet-editor_&_button]:[min-height:1.75rem]',
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-wrap [.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&]:mb-editor-field',
    '[.puppet-editor_&_button]:[height:1.75rem] ' +
      '[.puppet-editor_&_button]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_button]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-secondary,#a7b3af)]',
    '[.puppet-editor_&_button]:[background:var(--puppet-color-control,#171e1b)] ' +
      '[.puppet-editor_&_button]:text-editor-caption',
    '[.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button]:p-editor-related [.puppet-editor_&_button]:flex-none',
    '[.puppet-editor_&_button:disabled]:[opacity:0.38] [.puppet-editor_&_button:disabled]:cursor-not-allowed',
    '[.puppet-editor_&_button:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#61e3c1)]',
    '[.puppet-editor_&_button:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'layer-tree': [
    '[.puppet-editor_&]:w-full [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:[grid-template-columns:minmax(0,_1fr)]',
    '[.puppet-editor_&]:grid [.puppet-editor_&]:gap-editor-related [.puppet-editor_&]:m-0 [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:[list-style:none]',
    '[.puppet-editor_&_ul]:grid [.puppet-editor_&_ul]:gap-editor-related [.puppet-editor_&_ul]:m-0',
    '[.puppet-editor_&_ul]:[grid-template-columns:minmax(0,_1fr)]',
    '[.puppet-editor_&_ul]:p-0 [.puppet-editor_&_ul]:[list-style:none]',
    '[.puppet-editor_&.root-drop-active]:[box-shadow:inset_0_-0.125rem_0_var(--puppet-color-accent,#e5b55a)]',
  ],
  'layers-panel': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-col [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:overflow-hidden',
    '[.puppet-editor_&_>_:not(.puppet-layer-list-menu)]:shrink-0',
    '[.puppet-editor_&]:[grid-area:layers] ' +
      '[.puppet-editor_&]:[border-right:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],
  'puppet-layer-choice': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:min-w-0 [.puppet-editor_&]:items-center',
    '[.puppet-editor_&]:gap-editor-field [.puppet-editor_&_>_.layer-select]:flex-1',
  ],
  'puppet-layer-container-icon': [
    '[.puppet-editor_&]:[width:1.75rem] [.puppet-editor_&]:[height:1.75rem] [.puppet-editor_&]:[flex:none]',
    '[.puppet-editor_&.group]:[color:var(--puppet-color-accent,#e5b55a)]',
    '[.puppet-editor_&.deformer]:[color:var(--puppet-color-accent,#76d8c0)]',
  ],
  'puppet-layer-list-menu': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-col [.puppet-editor_&]:min-h-0',
    '[.puppet-editor_&]:min-w-0 [.puppet-editor_&]:flex-1',
  ],
  'puppet-layer-name-editor': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:[grid-template-columns:2.375rem_minmax(0,_1fr)] [.puppet-editor_&]:gap-editor-field',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:py-editor-control [.puppet-editor_&]:px-editor-related',
    '[.puppet-editor_&_input]:min-w-0 [.puppet-editor_&_input]:py-editor-related',
    '[.puppet-editor_&_input]:px-editor-field',
    '[.puppet-editor_&_input]:[border:0.0625rem_solid_var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&_input]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&_input]:[color:var(--puppet-color-text,#e5eeea)]',
    '[.puppet-editor_&_input]:[background:var(--puppet-color-control,#171e1b)] ' +
      '[.puppet-editor_&_input]:text-editor-body',
    '[.puppet-editor_&_input:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#61e3c1)]',
    '[.puppet-editor_&_input:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'puppet-layer-row-menu': ['[.puppet-editor_&]:contents'],
  'puppet-layer-state-actions': [
    '[.puppet-editor_&_button]:inline-grid [.puppet-editor_&_button]:place-items-center',
    '[.puppet-editor_&_button]:[min-height:1.625rem] ' +
      '[.puppet-editor_&_button]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&_button]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&_button]:[color:var(--puppet-color-text-secondary,#a7b3af)]',
    '[.puppet-editor_&_button]:[background:var(--puppet-color-control,#171e1b)] ' +
      '[.puppet-editor_&_button]:text-editor-caption',
    '[.puppet-editor_&_button]:cursor-pointer',
    '[.puppet-editor_&_button:disabled]:[opacity:0.38] [.puppet-editor_&_button:disabled]:cursor-not-allowed',
    '[.puppet-editor_&]:flex [.puppet-editor_&]:gap-editor-tight [.puppet-editor_&]:pr-editor-related',
    '[.puppet-editor_&_button]:[width:1.5rem] [.puppet-editor_&_button]:p-0',
    '[.puppet-editor_&_button]:[border-color:transparent] [.puppet-editor_&_button]:[background:transparent]',
    '[.puppet-editor_&_button:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#61e3c1)]',
    '[.puppet-editor_&_button:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'puppet-layer-state-icon': [
    '[.puppet-editor_&]:block [.puppet-editor_&]:[width:0.875rem] [.puppet-editor_&]:[height:0.875rem]',
  ],
  'puppet-layer-toolbar-icon': [
    '[.puppet-editor_&]:block [.puppet-editor_&]:[width:0.875rem] [.puppet-editor_&]:[height:0.875rem]',
  ],
  'puppet-layer-tree-item': [
    `${selectedLayerRow}:[border-color:var(--puppet-color-accent,#64e5c4)]`,
    `${selectedLayerRow}:[background:var(--puppet-color-selected,#1a2925)]`,
    `${selectedLayerRow}:[box-shadow:inset_0.1875rem_0_0_var(--puppet-color-accent,#64e5c4)]`,
    '[.puppet-editor_&.dragging_>_.layer-tree-node_>_.editor-context-menu-trigger_>_.layer-row]:[opacity:0.5]',
  ],
  'puppet-layer-tree-spacer': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[width:1rem] [.puppet-editor_&]:[height:2.25rem]',
    '[.puppet-editor_&]:p-0 [.puppet-editor_&]:place-items-center',
  ],
  'puppet-layer-tree-toggle': [
    '[.puppet-editor_&]:[min-height:1.625rem] ' +
      '[.puppet-editor_&]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)]',
    '[.puppet-editor_&]:[border-radius:0.3125rem] ' +
      '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#a7b3af)]',
    '[.puppet-editor_&]:[background:var(--puppet-color-control,#171e1b)] [.puppet-editor_&]:text-editor-caption',
    '[.puppet-editor_&]:cursor-pointer',
    '[.puppet-editor_&]:grid [.puppet-editor_&]:[width:1rem] [.puppet-editor_&]:[height:2.25rem]',
    '[.puppet-editor_&]:p-0 [.puppet-editor_&]:place-items-center',
    '[.puppet-editor_&]:[border-color:transparent] [.puppet-editor_&]:[background:transparent]',
    '[.puppet-editor_&:focus-visible]:[outline:0.125rem_solid_var(--puppet-color-accent,#61e3c1)]',
    '[.puppet-editor_&:focus-visible]:[outline-offset:0.0625rem]',
  ],
  'puppet-layer-tree-toggle-icon': [
    '[.puppet-editor_&]:[width:calc(1.25rem_*_2_/_3)] [.puppet-editor_&]:[height:calc(1.25rem_*_2_/_3)]',
    '[.puppet-editor_&]:[transform-origin:center]',
    '[.puppet-editor_&.expanded]:[transform:rotate(90deg)]',
  ],
}
