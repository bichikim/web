export const initialSceneFallbackShortcuts = {
  'pomo-loading':
    'flex min-h-control-sm box-border items-center gap-2 rounded-control bg-surface py-0 px-3 ' +
    'text-foreground text-sm font-650 leading-5 shadow-panel',
  'pomo-loading__spinner':
    'w-4.5 h-4.5 box-border flex-none animate-spin [border:0.125rem_solid_rgb(255_255_255_/_28%)] ' +
    'border-t-highlight rounded-control motion-reduce:animate-[none]',
  'pomo-scene-fallback':
    'pointer-events-none absolute inset-0 grid place-items-center text-foreground',
  'pomo-scene-fallback__panel':
    'border border-solid border-border rounded-control backdrop-blur-surface',
} as const
