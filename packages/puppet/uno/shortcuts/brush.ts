import {numberFieldDescendants} from './controls'

export const brushShortcuts = {
  'deform-brush-ring': [
    '[.puppet-editor_&.deform-brush-ring]:pointer-events-none',
    '[.puppet-editor_&.deform-brush-ring]:fill-none',
    '[.puppet-editor_&.deform-brush-ring]:[stroke:#ffffff]',
    '[.puppet-editor_&.deform-brush-ring]:[stroke-width:1.5px]',
    '[.puppet-editor_&.deform-brush-ring]:[r:calc(var(--brush-radius)*1px)]',
  ],
  'deform-brush-settings': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:w-max [.puppet-editor_&]:min-w-max',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:gap-editor-group',
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:border-0 [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:text-[#e4eee9] [.puppet-editor_&]:text-editor-body',
    ...numberFieldDescendants,
    '[.puppet-editor_&_label]:flex [.puppet-editor_&_label]:w-40',
    '[.puppet-editor_&_label]:shrink-0 [.puppet-editor_&_label]:items-center',
    '[.puppet-editor_&_label]:gap-editor-field [.puppet-editor_&_label]:whitespace-nowrap',
  ],
  'deform-brush-toolbar': [
    '[.puppet-editor_&_button]:inline-flex [.puppet-editor_&_button]:flex-none',
    '[.puppet-editor_&_button]:items-center [.puppet-editor_&_button]:gap-editor-related',
    '[.puppet-editor_&_button]:whitespace-nowrap',
  ],
  'keyform-brush-mount':
    '[.puppet-editor_&]:ml-auto [.puppet-editor_&]:flex [.puppet-editor_&]:shrink-0 [.puppet-editor_&]:items-center',
  'mesh-editing-separator': [
    '[.puppet-editor_&]:block [.puppet-editor_&]:h-5 [.puppet-editor_&]:w-px',
    '[.puppet-editor_&]:shrink-0 [.puppet-editor_&]:bg-[#35413d]',
  ],
  'mesh-editing-toolbar': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:flex-nowrap [.puppet-editor_&]:min-w-max',
    '[.puppet-editor_&_>_*]:shrink-0',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:gap-editor-field',
  ],
}
