import {numberFieldDescendants} from '@winter-love/puppet/uno'

export const viewerShortcuts = {
  'puppet-runtime-menu': [
    'data-[top-layer=true]:!fixed data-[top-layer=true]:!right-auto data-[top-layer=true]:!bottom-auto',
    'data-[top-layer=true]:!m-0 data-[top-layer=true]:!left-[var(--runtime-menu-x)]',
    'data-[top-layer=true]:!top-[var(--runtime-menu-y)]',
  ],
  'puppet-viewer-background': 'w-28',

  'puppet-viewer-page': [
    'h-full w-full [&.puppet-editor]:min-h-0 [&.puppet-editor]:[grid-template-rows:auto_minmax(0,1fr)]',
    '[&.puppet-editor]:[grid-template-columns:minmax(0,1fr)] [&.puppet-editor]:[grid-template-areas:none]',
    '[&.puppet-editor]:[background:var(--puppet-color-panel,#101513)] [color:var(--puppet-color-text,#edf4f0)]',
    '[&_.editor-text-input]:[border:0.0625rem_solid_var(--puppet-color-border,#35413d)] ' +
      '[&_.editor-text-input]:rounded-md',
    '[&_.editor-text-input]:bg-[var(--puppet-color-input,#121816)] ' +
      '[&_.editor-text-input]:text-[var(--puppet-color-text,#edf4f0)]',
    '[&_.editor-text-input:focus-visible]:outline ' +
      '[&_.editor-text-input:focus-visible]:outline-[var(--puppet-color-accent,#64e5c4)]',
    ...numberFieldDescendants,
  ],
  'puppet-viewer-stage': [
    'min-h-0 min-w-0 overflow-hidden relative touch-none data-[panning=true]:cursor-grabbing',
    '[&_canvas]:block [&_canvas]:w-full [&_canvas]:h-full',
  ],
  'puppet-viewer-surface': 'absolute inset-0',
  'puppet-viewer-time': 'editor-type-metadata font-editor-mono ml-auto whitespace-nowrap',
  'puppet-viewer-toolbar': [
    'workspace-header bg-[var(--puppet-color-panel,#101513)]',
    '[border:0] [border-bottom:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],
}

export const runtimeShortcuts = {
  'puppet-connection-form': [
    'flex flex-wrap gap-editor-related items-end p-editor-group bg-[var(--puppet-color-control,#18211e)]',
    '[&_label]:grid [&_label]:gap-editor-related',
  ],
  'puppet-correction-section': [
    '[border-top:1px_solid_var(--puppet-color-divider,#31433a)]',
    '[&>summary]:flex [&>summary]:items-center [&>summary]:gap-2',
    '[&>summary]:h-7 [&>summary]:box-border [&>summary]:px-2 [&>summary]:cursor-pointer [&>summary]:list-none',
    '[&>summary::-webkit-details-marker]:hidden [&>summary]:text-editor-caption',
    '[&>summary:hover]:bg-[var(--puppet-color-hover,#203029)]',
    '[&>summary:focus-visible]:outline-2 [&>summary:focus-visible]:outline-[var(--puppet-color-accent,#64e5c4)]',
    '[&>summary>.puppet-icon-chevron-right]:shrink-0',
    '[&[open]>summary>.puppet-icon-chevron-right]:[rotate:90deg]',
    '[&>.puppet-runtime-bounds]:p-3 [&>.puppet-runtime-bounds]:gap-2 [&_button]:self-end',
    '[&>.puppet-runtime-bounds_label]:grid [&>.puppet-runtime-bounds_label]:gap-1',
  ],
  'puppet-correction-sections': 'grid mt-1',
  'puppet-correction-summary':
    'ml-auto min-w-0 truncate font-editor-mono text-[var(--puppet-color-text-secondary,#b9c5c0)] tabular-nums',
  'puppet-correction-title':
    'flex items-center justify-between gap-editor-related [&>strong]:min-w-0 [&>strong]:truncate',
  'puppet-correction-values': [
    'grid [grid-template-columns:minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-editor-field',
    'text-editor-caption text-[var(--puppet-color-text-secondary,#b9c5c0)]',
    '[&>div]:grid [&>div]:gap-editor-related [&_output]:font-editor-mono',
    '[&_output]:text-[var(--puppet-color-text,#edf4f0)] [&_output]:tabular-nums',
  ],
  'puppet-edge-handle': [
    'fill-[var(--puppet-color-accent,#fff2a8)] stroke-[var(--puppet-color-canvas,#111715)] ' +
      '[stroke-width:2] [pointer-events:all] ' +
      'cursor-grab touch-none',
    'focus-visible:outline-none focus-visible:stroke-[var(--puppet-color-text,#ffffff)]',
  ],
  'puppet-graph-canvas': [
    'relative flex-1 min-h-0 min-w-0 [--xy-background-color:var(--puppet-color-canvas,#111715)]',
    '[--xy-connectionline-stroke:var(--puppet-color-accent,#64e5c4)]',
    '[--xy-edge-stroke-selected:var(--puppet-color-accent,#64e5c4)]',
    '[--xy-edge-label-background-color:var(--puppet-color-panel,#101513)]',
    '[--xy-node-color:var(--puppet-color-text,#edf4f0)]',
    '[--xy-node-background-color:var(--puppet-color-control,#171e1b)]',
    '[--xy-node-border:1px_solid_var(--puppet-color-border,#35413d)]',
    '[--xy-node-border-selected:1px_solid_var(--puppet-color-accent,#64e5c4)]',
    '[--xy-node-group-background-color:color-mix(in_srgb,var(--puppet-color-selected,#24443b)_25%,transparent)]',
    '[--xy-node-boxshadow-hover:0_1px_4px_1px_color-mix(in_srgb,var(--puppet-color-shadow,#000000)_8%,transparent)]',
    '[--xy-node-boxshadow-selected:0_0_0_0.5px_var(--puppet-color-accent,#64e5c4)]',
    '[--xy-controls-button-background-color:var(--puppet-color-control,#171e1b)]',
    '[--xy-controls-button-background-color-hover:var(--puppet-color-hover,#293832)]',
    '[--xy-controls-button-color:var(--puppet-color-text,#edf4f0)]',
    '[--xy-controls-button-color-hover:var(--puppet-color-text,#edf4f0)]',
    '[--xy-controls-button-border-color:var(--puppet-color-border,#35413d)]',
    '[--xy-controls-box-shadow:0_0_2px_1px_color-mix(in_srgb,var(--puppet-color-shadow,#000000)_8%,transparent)]',
    '[--xy-selection-background-color:color-mix(in_srgb,var(--puppet-color-accent,#64e5c4)_8%,transparent)]',
    '[--xy-selection-border:1px_dotted_var(--puppet-color-accent,#64e5c4)]',
    '[--xy-resize-background-color:var(--puppet-color-accent,#64e5c4)]',
    '[--xy-attribution-background-color:color-mix(in_srgb,var(--puppet-color-panel,#101513)_50%,transparent)]',
    '[--xy-attribution-color:var(--puppet-color-text-secondary,#b9c5c0)]',
    '[--xy-background-pattern-color:var(--puppet-color-divider,#34413d)] ' +
      '[--xy-edge-stroke:var(--puppet-color-accent,#64e5c4)]',
    '[&_.solid-flow\\_\\_handle]:w-3 [&_.solid-flow\\_\\_handle]:h-3 ' +
      '[&_.solid-flow\\_\\_handle]:bg-[var(--puppet-color-accent,#64e5c4)]',
    '[&_.solid-flow\\_\\_handle]:[border:2px_solid_var(--puppet-color-canvas,#111715)]',
    '[&_.solid-flow\\_\\_edge.selected_.solid-flow\\_\\_edge-path]:stroke-[var(--puppet-color-accent,#fff2a8)]',
    '[&_.solid-flow\\_\\_edge-path]:stroke-[var(--puppet-color-accent,#64e5c4)] ' +
      '[&_.solid-flow\\_\\_edge-path]:[stroke-width:2]',
    '[&_.puppet-graph-edge-disabled]:opacity-40',
    '[&_.puppet-graph-edge-disabled_.solid-flow\\_\\_edge-path]:[stroke-dasharray:5_4]',
  ],
  'puppet-graph-controls': [
    '[.puppet-editor_&]:gap-editor-related [.puppet-editor_&]:m-editor-group [.puppet-editor_&]:shadow-none',
    '[.puppet-editor_&_.solid-flow\\_\\_controls-button]:canvas-view-button',
    '[.puppet-editor_&_.solid-flow\\_\\_controls-button:hover]:editor-button-hover',
    '[.puppet-editor_&_.solid-flow\\_\\_controls-button:focus-visible]:editor-button-focus',
    '[.puppet-editor_&_.solid-flow\\_\\_controls-button:disabled]:opacity-40',
    '[.puppet-editor_&_.solid-flow\\_\\_controls-button:disabled_svg]:[fill-opacity:1]',
  ],
  'puppet-graph-correction':
    'puppet-node-shadow w-64 rounded-lg bg-[var(--puppet-color-control,#18211e)] ' +
    '[border:1px_solid_var(--puppet-color-border,#40524a)]',
  'puppet-graph-fields':
    'grid gap-2 p-3 [&_label]:min-w-0 [&_label]:text-editor-caption [&_label]:grid [&_label]:gap-1',
  'puppet-graph-port': [
    'relative flex items-center justify-between gap-editor-related px-editor-group py-2',
    '[border-top:1px_solid_var(--puppet-color-hover,#273a31)]',
    '[&>span]:truncate [&>output]:font-editor-mono [&>output]:text-editor-caption ' +
      '[&>output]:text-[var(--puppet-color-text-secondary,#b9c5c0)]',
  ],
  'puppet-graph-ports': [
    'puppet-node-shadow w-52 rounded-lg bg-[var(--puppet-color-control,#18211e)] ' +
      '[border:1px_solid_var(--puppet-color-border,#40524a)]',
    '[&>strong]:block [&>strong]:p-editor-group',
  ],
  'puppet-graph-title':
    'p-editor-field [border-bottom:1px_solid_var(--puppet-color-border,#40524a)]',
  'puppet-graph-toolbar': [
    'flex flex-wrap items-center gap-editor-related p-editor-group [&>span]:text-editor-caption',
    '[&>span]:text-[var(--puppet-color-text-secondary,#b9c5c0)]',
  ],
  'puppet-graph-trash': [
    'absolute right-4 bottom-4 grid place-items-center w-14 h-14 box-border rounded-lg',
    'bg-[var(--puppet-color-control,#18211e)] text-[var(--puppet-color-text-secondary,#b9c5c0)] border ' +
      'border-solid border-[var(--puppet-color-border,#40524a)] select-none',
    '[&>.puppet-icon]:w-6 [&>.puppet-icon]:h-6',
    'data-[active=true]:bg-[var(--puppet-error-active-surface,#482923)]',
    'data-[active=true]:border-[var(--puppet-color-error,#ff9b8a)]',
    'data-[active=true]:text-[var(--puppet-color-error,#ffcabf)]',
  ],
  'puppet-group-container':
    'w-72 rounded-lg !bg-transparent [height:var(--group-height)] ' +
    'focus-visible:outline-[var(--puppet-color-accent,#64e5c4)]',
  'puppet-group-handle': '!top-1/2',
  'puppet-group-input':
    'relative flex items-center justify-between h-6 px-editor-group box-border text-editor-caption ' +
    'text-[var(--puppet-color-text-secondary,#b9c5c0)]',
  'puppet-group-node':
    'puppet-node-shadow h-full w-full box-border rounded-lg bg-[var(--puppet-color-control,#15201c)] ' +
    '[border:1px_solid_var(--puppet-color-border,#52665c)]',
  'puppet-group-title':
    'flex items-center justify-between gap-editor-related h-10 box-border px-editor-field [&>strong]:truncate',
  'puppet-group-value': 'font-editor-mono text-editor-caption tabular-nums',
  'puppet-input-title':
    'flex items-center gap-2 p-editor-field [&>strong]:flex-1 [&>strong]:min-w-0 [&>strong]:truncate',
  'puppet-mapping-graph': 'flex flex-col flex-1 min-h-48 min-w-0 overflow-hidden',
  'puppet-node-shadow':
    '[box-shadow:0_4px_12px_color-mix(in_srgb,var(--puppet-color-shadow,#000000)_32%,transparent),' +
    '0_1px_3px_color-mix(in_srgb,var(--puppet-color-shadow,#000000)_24%,transparent)]',
  'puppet-parameter-block': [
    'relative flex items-center justify-between gap-editor-related w-60 h-10 box-border px-editor-group',
    'puppet-node-shadow rounded-lg bg-[var(--puppet-color-control,#18211e)] ' +
      '[border:1px_solid_var(--puppet-color-border,#40524a)]',
    '[&>span]:truncate [&>output]:shrink-0 [&>output]:font-editor-mono ' +
      '[&>output]:text-[var(--puppet-color-text-secondary,#b9c5c0)]',
  ],
  'puppet-parameter-row':
    '!shadow-none !w-72 !rounded-none !bg-transparent !border-0 !border-t ' +
    '!border-t-[var(--puppet-color-hover,#273a31)]',
  'puppet-runtime-actions': [
    'flex flex-wrap items-center gap-editor-related [&_input]:min-w-0 [&_input]:max-w-36',
  ],
  'puppet-runtime-bounds': [
    'grid [grid-template-columns:repeat(2,minmax(0,1fr))] gap-editor-related [&_label]:min-w-0',
  ],
  'puppet-runtime-camera': [
    'w-full aspect-video bg-[var(--puppet-color-panel,#101513)] rounded [transform:scaleX(-1)] ' +
      '[&[hidden]]:hidden',
  ],
  'puppet-runtime-mapping': [
    'grid gap-editor-related p-editor-field [border:0] ' +
      '[border-bottom:0.0625rem_solid_var(--puppet-color-divider,#27302d)] [&_summary]:flex',
    '[&_summary]:items-center [&_summary]:gap-editor-related [&_summary]:cursor-pointer',
    '[&_summary_span]:text-editor-caption',
  ],
  'puppet-runtime-parameter': [
    'grid [grid-template-columns:minmax(0,1fr)_5rem_auto] items-center gap-editor-related',
    '[&_label]:[grid-column:1/-1] [&_label]:text-editor-caption',
  ],
  'puppet-runtime-resizer': [
    '[grid-column:2] [grid-row:1] cursor-col-resize touch-none bg-[var(--puppet-color-divider,#27302d)]',
    'hover:bg-[var(--puppet-color-accent,#64e5c4)] focus-visible:bg-[var(--puppet-color-accent,#64e5c4)] ' +
      'focus-visible:outline-2 focus-visible:outline-[var(--puppet-color-accent,#64e5c4)]',
  ],
  'puppet-runtime-section': [
    'grid shrink-0 gap-editor-field [border:0] ' +
      '[border-bottom:0.0625rem_solid_var(--puppet-color-divider,#27302d)] pb-editor-group',
    '[&:is(details):not([open])]:block',
    '[&_summary]:cursor-pointer [&_summary]:py-editor-field [&_summary]:editor-type-section',
    '[&_output]:editor-type-metadata [&_dl]:font-editor-mono [&_dl]:editor-type-metadata',
  ],
  'puppet-runtime-sidebar': [
    'flex flex-col gap-editor-group min-h-0 min-w-0 overflow-y-auto p-editor-group ' +
      'bg-[var(--puppet-color-panel,#101513)]',
    '[border:0] [border-left:0.0625rem_solid_var(--puppet-color-divider,#27302d)]',
  ],
  'puppet-runtime-split': [
    'grid min-h-0 min-w-0 [grid-template-columns:minmax(0,var(--runtime-stage-width))_0.5rem_minmax(0,1fr)]',
    '[&>.puppet-viewer-stage]:[grid-column:1] [&>.puppet-viewer-stage]:[grid-row:1]',
    '[&>aside]:[grid-column:3] [&>aside]:[grid-row:1]',
  ],
  'puppet-studio-tools': [
    'flex flex-col min-h-0 min-w-0 overflow-hidden bg-[var(--puppet-color-panel,#101513)]',
    '[&>.puppet-runtime-section]:px-editor-group [&>.puppet-runtime-section]:pt-editor-group',
    '[&_.puppet-runtime-camera]:max-h-40 [&_.puppet-runtime-camera]:object-contain',
  ],
}
