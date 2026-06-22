import {
  type BlocksPresenceUser,
  type CollaborativeBlocksWorkspace,
  createBlocksEditor,
} from '@winter-love/blocks'
import {createEffect, createSignal, onCleanup} from 'solid-js'

export interface BlocksEditorMountProps {
  readonly class?: string
  readonly onUsersChange?: (users: readonly BlocksPresenceUser[]) => void
  readonly workspace: CollaborativeBlocksWorkspace
}

export const BlocksEditorMount = (props: BlocksEditorMountProps) => {
  const [container, setContainer] = createSignal<HTMLDivElement>()

  createEffect(() => {
    const element = container()
    const className = props.class
    // eslint-disable-next-line prefer-destructuring -- Solid props must stay on the proxy inside tracked scopes.
    const onUsersChange = props.onUsersChange
    // eslint-disable-next-line prefer-destructuring -- Solid props must stay on the proxy inside tracked scopes.
    const workspace = props.workspace

    if (element === undefined) {
      return
    }

    const editor = createBlocksEditor({
      className,
      placeholder: 'Write something',
      workspace,
    })
    const unsubscribeUsers = workspace.subscribeUsers((users) => {
      onUsersChange?.(users)
    })

    editor.mount(element)

    onCleanup(() => {
      unsubscribeUsers()
      editor.destroy()
    })
  })

  return <div ref={setContainer} />
}
