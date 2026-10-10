import {Show} from 'solid-js'
import type {WorkspaceSelection} from './types'
import type {useTreeFileActions} from './use-tree-file-actions'
import {SDeleteEntryDialog} from './SDeleteEntryDialog'
import {SFilePasteDialog} from './SFilePasteDialog'
import {SFileTreeContextMenu} from './SFileTreeContextMenu'
import {SNotice} from './SNotice'
import {SRenameEntryDialog} from './SRenameEntryDialog'

interface SFileTreeActionsProps {
  readonly actions: ReturnType<typeof useTreeFileActions>
  readonly workspace?: string
  readonly onCopy?: (path: string) => void
  readonly onShare?: (selection: WorkspaceSelection) => void
  readonly onClose: () => void
}
export const SFileTreeActions = (props: SFileTreeActionsProps) => (
  <>
    <Show when={props.actions.deleting() === null && props.actions.feedback()} keyed>
      {(message) => <SNotice message={message} onDismiss={props.actions.dismissFeedback} />}
    </Show>
    <Show when={props.actions.renaming() === null && props.actions.renameFeedback()} keyed>
      {(message) => <SNotice message={message} onDismiss={props.actions.dismissRenameFeedback} />}
    </Show>
    <SRenameEntryDialog operations={props.actions} onClose={props.onClose} />
    <SDeleteEntryDialog operations={props.actions} onClose={props.onClose} />
    <SFilePasteDialog operations={props.actions} onClose={props.onClose} />
    <Show when={props.actions.context()} keyed>
      {(context) => (
        <SFileTreeContextMenu
          x={context.x}
          y={context.y}
          selection={context.selection}
          canModify={
            !props.actions.pending() &&
            !props.actions.renamePending() &&
            context.selection.path !== props.workspace
          }
          canPaste={props.actions.canPaste() && !props.actions.renamePending()}
          onCopyEntry={props.actions.copy}
          onCutEntry={props.actions.cut}
          onPasteEntry={props.actions.paste}
          onRenameEntry={props.actions.askRename}
          onDeleteEntry={props.actions.askDelete}
          onShare={props.onShare}
          onCopy={props.onCopy}
          onClose={props.actions.close}
        />
      )}
    </Show>
  </>
)
