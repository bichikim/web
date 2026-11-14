/**
 * Entry card lists, cards and field grids built on the physics card layout and density. Expression,
 * pose, hit area, physics chain, parameter effect and motion sound editors share them. The motion
 * settings popover reuses the influence curve popover.
 */
export const entryCardShortcuts = {
  'entry-action-button': 'physics-action-button',
  'entry-card': 'physics-pendulum',
  'entry-card-header': 'physics-pendulum-header',
  'entry-card-list': 'physics-pendulum-list',
  'entry-empty': 'physics-empty',
  'entry-fields': 'physics-number-fields',
  'entry-header': 'physics-header',
  'entry-name-error': 'error-message',
  'entry-remove-button': 'physics-remove-button',
  'entry-settings': 'physics-settings',
  'motion-settings-popover': [
    'influence-popover',
    '[&_.editor-text-input]:min-w-0 [&_.editor-text-input]:w-full',
    '[&_.editor-text-input]:border [&_.editor-text-input]:border-solid ' +
      '[&_.editor-text-input]:border-[var(--puppet-color-border,#35413d)]',
    '[&_.editor-text-input]:rounded-md [&_.editor-text-input]:bg-[var(--puppet-color-input,#121816)] ' +
      '[&_.editor-text-input]:text-[var(--puppet-color-text,#edf4f0)]',
    '[&_.editor-text-input::placeholder]:text-[var(--puppet-color-text-muted,#84918c)]',
    '[&_fieldset]:grid [&_fieldset]:gap-editor-field ' +
      '[&_fieldset]:border-[var(--puppet-color-border,#35413d)] [&_fieldset]:rounded-md',
  ],
}
