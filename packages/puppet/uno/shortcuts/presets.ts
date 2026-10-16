/**
 * Expression, pose and hit area editors reuse the physics card layout and density; the motion
 * settings popover reuses the influence curve popover.
 */
export const presetShortcuts = {
  'motion-settings-popover': [
    'influence-popover',
    '[&_.editor-text-input]:min-w-0 [&_.editor-text-input]:w-full',
    '[&_.editor-text-input]:border [&_.editor-text-input]:border-solid [&_.editor-text-input]:border-[#35413d]',
    '[&_.editor-text-input]:rounded-md [&_.editor-text-input]:bg-[#121816] [&_.editor-text-input]:text-[#edf4f0]',
    '[&_.editor-text-input::placeholder]:text-[#84918c]',
    '[&_fieldset]:grid [&_fieldset]:gap-editor-field [&_fieldset]:border-[#35413d] [&_fieldset]:rounded-md',
  ],
  'preset-action-button': 'physics-action-button',
  'preset-card': 'physics-pendulum',
  'preset-card-header': 'physics-pendulum-header',
  'preset-card-list': 'physics-pendulum-list',
  'preset-empty': 'physics-empty',
  'preset-fields': 'physics-number-fields',
  'preset-header': 'physics-header',
  'preset-name-error': 'error-message',
  'preset-remove-button': 'physics-remove-button',
  'preset-settings': 'physics-settings',
}
