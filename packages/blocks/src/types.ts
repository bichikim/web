import type * as Y from 'yjs'
import type {WebsocketProvider} from 'y-websocket'

export interface BlocksUser {
  readonly color: string
  readonly name: string
}

export interface BlocksBlock {
  readonly id: string
  readonly text: string
  readonly type: 'paragraph'
}

export interface BlocksDoc {
  readonly blocks: readonly BlocksBlock[]
}

export interface BlocksSelection {
  readonly anchorOffset: number
  readonly blockId: string
  readonly focusOffset: number
}

export interface BlocksPresenceUser extends BlocksUser {
  readonly clientId: number
  readonly isLocal: boolean
  readonly selection?: BlocksSelection
}

export interface CreateBlocksDocOptions {
  readonly id?: string
  readonly initialText?: string
  readonly title?: string
}

export interface CreateCollaborativeBlocksDocOptions extends CreateBlocksDocOptions {
  readonly room: string
  readonly user: BlocksUser
  readonly websocketUrl: string
}

export interface BlocksWorkspace {
  readonly blockTexts: Y.Map<Y.Text>
  readonly blocks: Y.Array<Y.Map<unknown>>
  readonly ydoc: Y.Doc
  getSnapshot(): BlocksDoc
  init(): void
}

export interface CollaborativeBlocksWorkspace extends BlocksWorkspace {
  readonly provider: WebsocketProvider
  destroy(): void
  getUsers(): readonly BlocksPresenceUser[]
  setSelection(selection: BlocksSelection | undefined): void
  subscribeUsers(listener: (users: readonly BlocksPresenceUser[]) => void): () => void
}

export interface BlocksEditor {
  destroy(): void
  focus(): void
  mount(container: HTMLElement): void
}

export interface BlocksEditorOptions {
  readonly className?: string
  readonly placeholder?: string
  readonly workspace: BlocksWorkspace
}
