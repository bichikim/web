import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import type {
  BlocksBlock,
  BlocksDoc,
  BlocksPresenceUser,
  BlocksSelection,
  BlocksWorkspace,
  CollaborativeBlocksWorkspace,
  CreateBlocksDocOptions,
  CreateCollaborativeBlocksDocOptions,
} from './types'

const BLOCKS_KEY = 'blocks'
const BLOCK_TEXTS_KEY = 'blockTexts'
const BLOCK_ID_RADIX = 36
const DEFAULT_TEXT = 'Start writing with Blocks, TypeScript, and Yjs.'

export const createBlocksWorkspace = (options: CreateBlocksDocOptions = {}): BlocksWorkspace => {
  const ydoc = new Y.Doc({guid: options.id})
  const blocks = ydoc.getArray<Y.Map<unknown>>(BLOCKS_KEY)
  const blockTexts = ydoc.getMap<Y.Text>(BLOCK_TEXTS_KEY)

  return {
    blocks,
    blockTexts,
    getSnapshot() {
      return getBlocksDoc(blocks, blockTexts)
    },
    init() {
      initializeBlocksDoc({blocks, blockTexts, initialText: options.initialText, ydoc})
    },
    ydoc,
  }
}

export const createCollaborativeBlocksWorkspace = (
  options: CreateCollaborativeBlocksDocOptions,
): CollaborativeBlocksWorkspace => {
  const workspace = createBlocksWorkspace({
    ...options,
    id: options.id ?? options.room,
  })
  const provider = new WebsocketProvider(options.websocketUrl, options.room, workspace.ydoc)

  provider.awareness.setLocalStateField('user', {
    color: options.user.color,
    name: options.user.name,
  })

  const onSync = (isSynced: boolean) => {
    if (!isSynced) {
      return
    }

    workspace.init()
  }

  provider.on('sync', onSync)

  return {
    ...workspace,
    destroy() {
      provider.off('sync', onSync)
      provider.destroy()
    },
    getUsers() {
      return getPresenceUsers(provider.awareness.getStates(), provider.awareness.clientID)
    },
    provider,
    setSelection(selection) {
      provider.awareness.setLocalStateField('selection', selection)
    },
    subscribeUsers(listener) {
      const notify = () =>
        listener(getPresenceUsers(provider.awareness.getStates(), provider.awareness.clientID))

      provider.awareness.on('change', notify)
      notify()

      return () => provider.awareness.off('change', notify)
    },
  }
}

export interface InitializeBlocksDocOptions {
  readonly blockTexts: Y.Map<Y.Text>
  readonly blocks: Y.Array<Y.Map<unknown>>
  readonly initialText?: string
  readonly ydoc: Y.Doc
}

export const initializeBlocksDoc = (options: InitializeBlocksDocOptions) => {
  if (options.blocks.length > 0) {
    return
  }

  options.ydoc.transact(() => {
    const blockId = createBlockId()
    const block = new Y.Map<unknown>()
    const text = new Y.Text()

    block.set('id', blockId)
    block.set('type', 'paragraph')
    text.insert(0, options.initialText ?? DEFAULT_TEXT)
    options.blockTexts.set(blockId, text)
    options.blocks.push([block])
  })
}

export const getBlocksDoc = (
  blocks: Y.Array<Y.Map<unknown>>,
  blockTexts: Y.Map<Y.Text>,
): BlocksDoc => ({
  blocks: blocks
    .toArray()
    .map((block): BlocksBlock | undefined => {
      const id = block.get('id')
      const type = block.get('type')

      if (typeof id !== 'string' || type !== 'paragraph') {
        return undefined
      }

      return {
        id,
        text: blockTexts.get(id)?.toString() ?? '',
        type,
      }
    })
    .filter((block): block is BlocksBlock => block !== undefined),
})

export const createBlockId = () => {
  const [value] = crypto.getRandomValues(new Uint32Array(1))

  return `block-${value.toString(BLOCK_ID_RADIX)}-${Date.now().toString(BLOCK_ID_RADIX)}`
}

const getPresenceUsers = (
  states: Map<number, unknown>,
  localClientId: number,
): readonly BlocksPresenceUser[] =>
  Array.from(states)
    .map(([clientId, state]) => {
      if (!isAwarenessState(state)) {
        return undefined
      }

      return {
        clientId,
        color: state.user.color,
        isLocal: clientId === localClientId,
        name: state.user.name,
        ...(state.selection === undefined ? {} : {selection: state.selection}),
      }
    })
    .filter((user): user is BlocksPresenceUser => user !== undefined)

interface AwarenessState {
  readonly selection?: BlocksSelection
  readonly user: {
    readonly color: string
    readonly name: string
  }
}

const isAwarenessState = (value: unknown): value is AwarenessState => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const state = value as Partial<AwarenessState>
  const {user} = state

  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.color === 'string' &&
    typeof user.name === 'string' &&
    (state.selection === undefined || isBlocksSelection(state.selection))
  )
}

const isBlocksSelection = (value: unknown): value is BlocksSelection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const selection = value as Partial<BlocksSelection>

  return (
    typeof selection.blockId === 'string' &&
    typeof selection.anchorOffset === 'number' &&
    typeof selection.focusOffset === 'number'
  )
}
