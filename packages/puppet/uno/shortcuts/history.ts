export const historyShortcuts = {
  'document-history-entry': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:w-full [.puppet-editor_&]:min-w-0',
    '[.puppet-editor_&]:items-center [.puppet-editor_&]:justify-between [.puppet-editor_&]:gap-editor-control',
    '[.puppet-editor_&]:[border-color:transparent] [.puppet-editor_&]:[background:transparent]',
    '[.puppet-editor_&]:[color:var(--puppet-color-text-secondary,#b9c5c0)] [.puppet-editor_&]:text-left',
    '[.puppet-editor_&[aria-current=step]]:[background:var(--puppet-color-selected,#24443b)]',
    '[.puppet-editor_&[aria-current=step]]:[border-color:var(--puppet-color-accent,#64e5c4)]',
    '[.puppet-editor_&[aria-current=step]]:[color:var(--puppet-color-text,#edf4f0)]',
    '[.puppet-editor_&[data-history-state=future]]:[color:var(--puppet-color-text-muted,#84918c)]',
    '[.puppet-editor_&_small]:shrink-0 [.puppet-editor_&_small]:text-editor-micro',
  ],
  'document-history-header': [
    '[.puppet-editor_&]:flex [.puppet-editor_&]:items-center [.puppet-editor_&]:justify-end',
    '[.puppet-editor_&]:gap-editor-related',
    '[.puppet-editor_&_button]:[width:var(--editor-control-height)] [.puppet-editor_&_button]:p-0',
  ],
  'document-history-list': [
    '[.puppet-editor_&]:m-0 [.puppet-editor_&]:p-0 [.puppet-editor_&]:list-none',
    '[.puppet-editor_&]:overflow-y-auto [.puppet-editor_&]:[max-height:10rem]',
    '[.puppet-editor_&]:[overscroll-behavior:contain]',
  ],
  'document-history-panel': '[.puppet-editor_&]:min-w-0',
  'document-history-title': '[.puppet-editor_&]:truncate',
  'inspector-content': [
    '[.puppet-editor_&]:grid [.puppet-editor_&]:min-h-0 [.puppet-editor_&]:content-start',
    '[.puppet-editor_&]:gap-editor-group [.puppet-editor_&]:overflow-y-auto [.puppet-editor_&]:p-editor-group',
    '[.puppet-editor_&]:[overscroll-behavior:contain] [.puppet-editor_&]:[scrollbar-gutter:stable]',
    '[.puppet-editor_&_>_*]:m-0 [.puppet-editor_&_>_section_>_.deformer-properties]:m-0',
  ],
}
