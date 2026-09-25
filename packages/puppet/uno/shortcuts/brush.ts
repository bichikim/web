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
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:gap-4',
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:border-0 [.puppet-editor_&]:p-0',
    '[.puppet-editor_&]:text-[#e4eee9]',
    ...numberFieldDescendants,
    '[.puppet-editor_&_label]:flex [.puppet-editor_&_label]:w-40',
    '[.puppet-editor_&_label]:shrink-0 [.puppet-editor_&_label]:items-center',
    '[.puppet-editor_&_label]:gap-2 [.puppet-editor_&_label]:whitespace-nowrap',
  ],
  'deform-brush-toolbar':
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:gap-1',
  'keyform-brush-mount':
    '[.puppet-editor_&]:ml-auto [.puppet-editor_&]:flex [.puppet-editor_&]:items-center',
}
