import {effect, type Effect, signal, type Signal} from 'alien-signals'
import * as Y from 'yjs'
import {createBlockId} from './workspace'
import type {
  BlocksBlock,
  BlocksDoc,
  BlocksEditor,
  BlocksEditorOptions,
  BlocksPresenceUser,
  BlocksSelection,
  CollaborativeBlocksWorkspace,
} from './types'

const BLOCKS_ROOT_CLASS = 'winter-blocks-editor'
const BLOCK_CLASS = 'winter-blocks-editor__block'
const CURSOR_LAYER_CLASS = 'winter-blocks-editor__cursor-layer'
const CURSOR_TOP_OFFSET = 3
const STYLE_TEXT = `
.winter-blocks-editor {
  position: relative;
  min-height: 100%;
  padding: 56px 64px;
  color: #171717;
  line-height: 1.7;
  outline: none;
}
.winter-blocks-editor__block {
  min-height: 1.7em;
  border-radius: 4px;
  padding: 2px 4px;
  white-space: pre-wrap;
  word-break: break-word;
  outline: none;
}
.winter-blocks-editor__block:empty::before {
  color: #a3a3a3;
  content: attr(data-placeholder);
}
.winter-blocks-editor__cursor-layer {
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}
.winter-blocks-editor__remote-cursor {
  height: 1.35em;
  position: absolute;
  width: 2px;
}
.winter-blocks-editor__remote-label {
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  left: 0;
  line-height: 1;
  max-width: 140px;
  overflow: hidden;
  padding: 4px 6px;
  position: absolute;
  text-overflow: ellipsis;
  top: -20px;
  white-space: nowrap;
}
`

export const createBlocksEditor = (options: BlocksEditorOptions): BlocksEditor =>
  new BlocksEditorController(options)

class BlocksEditorController implements BlocksEditor {
  readonly #docSignal: Signal<BlocksDoc>
  readonly #options: BlocksEditorOptions
  readonly #cursorRenderEffect: Effect<void>
  readonly #docRenderEffect: Effect<void>
  readonly #usersSignal: Signal<readonly BlocksPresenceUser[]>
  #blockList: HTMLDivElement | undefined
  #composingBlockId: string | undefined
  #container: HTMLElement | undefined
  #cursorLayer: HTMLDivElement | undefined
  #hasPendingDocUpdate = false
  #isDestroyed = false
  #isComposing = false
  #localSelection: BlocksSelection | undefined
  #root: HTMLDivElement | undefined
  #unsubscribeUsers: (() => void) | undefined

  constructor(options: BlocksEditorOptions) {
    this.#options = options
    this.#docSignal = signal<BlocksDoc>(options.workspace.getSnapshot())
    this.#usersSignal = signal<readonly BlocksPresenceUser[]>(getWorkspaceUsers(options.workspace))
    this.#docRenderEffect = effect(() => {
      this.#renderBlocks(this.#docSignal.get())
    })
    this.#cursorRenderEffect = effect(() => {
      this.#renderCursors(this.#usersSignal.get())
    })
  }

  destroy() {
    if (this.#isDestroyed) {
      return
    }

    this.#isDestroyed = true
    this.#docRenderEffect.stop()
    this.#cursorRenderEffect.stop()
    this.#unsubscribeUsers?.()
    this.#options.workspace.ydoc.off('update', this.#handleDocUpdate)
    document.removeEventListener('selectionchange', this.#handleSelectionChange)
    this.#root?.removeEventListener('compositionend', this.#handleCompositionEnd)
    this.#root?.removeEventListener('compositionstart', this.#handleCompositionStart)
    this.#root?.removeEventListener('input', this.#handleInput)
    this.#root?.removeEventListener('keydown', this.#handleKeyDown)
    this.#container?.replaceChildren()
    this.#container = undefined
    this.#root = undefined
    this.#blockList = undefined
    this.#cursorLayer = undefined
  }

  focus() {
    const firstBlock = this.#blockList?.querySelector<HTMLElement>(`.${BLOCK_CLASS}`)

    firstBlock?.focus()
  }

  mount(container: HTMLElement) {
    if (this.#root !== undefined) {
      return
    }

    const styleElement = document.createElement('style')
    const root = document.createElement('div')
    const blockList = document.createElement('div')
    const cursorLayer = document.createElement('div')

    this.#container = container
    this.#root = root
    this.#blockList = blockList
    this.#cursorLayer = cursorLayer
    styleElement.textContent = STYLE_TEXT
    root.className = [BLOCKS_ROOT_CLASS, this.#options.className].filter(Boolean).join(' ')
    cursorLayer.className = CURSOR_LAYER_CLASS
    root.append(blockList, cursorLayer)
    container.replaceChildren(styleElement, root)

    root.addEventListener('input', this.#handleInput)
    root.addEventListener('keydown', this.#handleKeyDown)
    root.addEventListener('compositionstart', this.#handleCompositionStart)
    root.addEventListener('compositionend', this.#handleCompositionEnd)
    document.addEventListener('selectionchange', this.#handleSelectionChange)
    this.#options.workspace.ydoc.on('update', this.#handleDocUpdate)
    this.#unsubscribeUsers = subscribeWorkspaceUsers(this.#options.workspace, (users) => {
      this.#usersSignal.set(users)
    })
    this.#docSignal.set(this.#options.workspace.getSnapshot())
  }

  readonly #handleDocUpdate = () => {
    if (this.#isComposing) {
      this.#hasPendingDocUpdate = true
      return
    }

    this.#docSignal.set(this.#options.workspace.getSnapshot())
  }

  readonly #handleInput = (event: Event) => {
    const element = getBlockElement(event.target)

    if (element === undefined) {
      return
    }

    const block = getBlockById(this.#docSignal.get(), element.dataset.blockId)

    if (block === undefined) {
      return
    }

    this.#localSelection = getSelectionFromDom(this.#root)
    updateWorkspaceSelection(this.#options.workspace, this.#localSelection)

    if (this.#isComposing || isComposingInput(event)) {
      return
    }

    this.#replaceText(block.id, element.textContent ?? '')
  }

  readonly #handleKeyDown = (event: KeyboardEvent) => {
    if (this.#isComposing || event.isComposing) {
      return
    }

    const selection = getSelectionFromDom(this.#root)

    if (selection === undefined || selection.anchorOffset !== selection.focusOffset) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      this.#splitBlock(selection)
      return
    }

    if (event.key === 'Backspace' && selection.anchorOffset === 0) {
      const changed = this.#mergeOrRemoveBlock(selection)

      if (changed) {
        event.preventDefault()
      }
    }
  }

  readonly #handleSelectionChange = () => {
    const selection = getSelectionFromDom(this.#root)

    if (selection === undefined) {
      return
    }

    this.#localSelection = selection
    updateWorkspaceSelection(this.#options.workspace, selection)
  }

  readonly #handleCompositionStart = (event: CompositionEvent) => {
    const element = getBlockElement(event.target)

    this.#isComposing = true
    this.#hasPendingDocUpdate = false
    this.#composingBlockId = element?.dataset.blockId
  }

  readonly #handleCompositionEnd = (event: CompositionEvent) => {
    const element = getBlockElement(event.target)
    const blockId = element?.dataset.blockId ?? this.#composingBlockId

    this.#isComposing = false
    this.#composingBlockId = undefined
    this.#localSelection = getSelectionFromDom(this.#root)

    if (blockId !== undefined && element !== undefined) {
      this.#replaceText(blockId, element.textContent ?? '')
    }

    updateWorkspaceSelection(this.#options.workspace, this.#localSelection)
    this.#flushPendingDocUpdate()
  }

  #flushPendingDocUpdate() {
    if (!this.#hasPendingDocUpdate) {
      return
    }

    this.#hasPendingDocUpdate = false
    this.#docSignal.set(this.#options.workspace.getSnapshot())
  }

  #replaceText(blockId: string, nextText: string) {
    const text = this.#options.workspace.blockTexts.get(blockId)

    if (text === undefined || text.toString() === nextText) {
      return
    }

    this.#options.workspace.ydoc.transact(() => {
      text.delete(0, text.length)
      text.insert(0, nextText)
    })
  }

  #splitBlock(selection: BlocksSelection) {
    const doc = this.#docSignal.get()
    const blockIndex = doc.blocks.findIndex((block) => block.id === selection.blockId)
    const block = doc.blocks[blockIndex]

    if (block === undefined) {
      return
    }

    const previousText = block.text.slice(0, selection.anchorOffset)
    const nextText = block.text.slice(selection.anchorOffset)
    const nextBlockId = createBlockId()

    this.#localSelection = {
      anchorOffset: 0,
      blockId: nextBlockId,
      focusOffset: 0,
    }
    this.#options.workspace.ydoc.transact(() => {
      const currentText = this.#options.workspace.blockTexts.get(block.id)
      const nextTextValue = new Y.Text()
      const nextBlock = new Y.Map<unknown>()

      currentText?.delete(0, currentText.length)
      currentText?.insert(0, previousText)
      nextTextValue.insert(0, nextText)
      nextBlock.set('id', nextBlockId)
      nextBlock.set('type', 'paragraph')
      this.#options.workspace.blockTexts.set(nextBlockId, nextTextValue)
      this.#options.workspace.blocks.insert(blockIndex + 1, [nextBlock])
    })

    updateWorkspaceSelection(this.#options.workspace, this.#localSelection)
  }

  #mergeOrRemoveBlock(selection: BlocksSelection) {
    const doc = this.#docSignal.get()
    const blockIndex = doc.blocks.findIndex((block) => block.id === selection.blockId)
    const block = doc.blocks[blockIndex]
    const previousBlock = doc.blocks[blockIndex - 1]

    if (block === undefined || previousBlock === undefined) {
      return false
    }

    const previousLength = previousBlock.text.length

    this.#localSelection = {
      anchorOffset: previousLength,
      blockId: previousBlock.id,
      focusOffset: previousLength,
    }
    this.#options.workspace.ydoc.transact(() => {
      const previousText = this.#options.workspace.blockTexts.get(previousBlock.id)

      if (block.text.length > 0) {
        previousText?.insert(previousLength, block.text)
      }

      this.#options.workspace.blocks.delete(blockIndex, 1)
      this.#options.workspace.blockTexts.delete(block.id)
    })

    updateWorkspaceSelection(this.#options.workspace, this.#localSelection)

    return true
  }

  #renderBlocks(doc: BlocksDoc) {
    if (this.#root === undefined || this.#blockList === undefined) {
      return
    }

    if (this.#isComposing) {
      this.#hasPendingDocUpdate = true
      return
    }

    const activeSelection = this.#localSelection
    const shouldRestoreSelection =
      document.activeElement !== null && this.#root.contains(document.activeElement)

    this.#blockList.replaceChildren(
      ...doc.blocks.map((block) => createBlockElement(block, this.#options.placeholder)),
    )
    restoreSelection(this.#root, activeSelection, shouldRestoreSelection)
  }

  #renderCursors(users: readonly BlocksPresenceUser[]) {
    if (this.#root === undefined || this.#cursorLayer === undefined) {
      return
    }

    renderRemoteCursors(this.#root, this.#cursorLayer, users)
  }
}

const createBlockElement = (block: BlocksBlock, placeholder = 'Write something') => {
  const element = document.createElement('div')

  element.className = BLOCK_CLASS
  element.contentEditable = 'true'
  element.dataset.blockId = block.id
  element.dataset.placeholder = placeholder
  element.role = 'textbox'
  element.textContent = block.text

  return element
}

const getBlockElement = (target: EventTarget | Node | null) => {
  if (!(target instanceof Node)) {
    return undefined
  }

  const element = target instanceof Element ? target : target.parentElement

  return element?.closest<HTMLElement>(`.${BLOCK_CLASS}`) ?? undefined
}

const getBlockById = (doc: BlocksDoc, blockId: string | undefined) =>
  doc.blocks.find((block) => block.id === blockId)

const isComposingInput = (event: Event) => event instanceof InputEvent && event.isComposing

const getSelectionFromDom = (root: HTMLElement | undefined): BlocksSelection | undefined => {
  if (root === undefined) {
    return undefined
  }

  const selection = document.getSelection()

  if (selection === null || selection.rangeCount === 0) {
    return undefined
  }

  const anchorBlock = getBlockElement(selection.anchorNode)
  const focusBlock = getBlockElement(selection.focusNode)

  if (anchorBlock === undefined || focusBlock === undefined || !root.contains(anchorBlock)) {
    return undefined
  }

  const {blockId} = anchorBlock.dataset

  if (blockId === undefined || focusBlock.dataset.blockId !== blockId) {
    return undefined
  }

  return {
    anchorOffset: getNodeOffset(anchorBlock, selection.anchorNode, selection.anchorOffset),
    blockId,
    focusOffset: getNodeOffset(focusBlock, selection.focusNode, selection.focusOffset),
  }
}

const getNodeOffset = (blockElement: HTMLElement, node: Node | null, offset: number) => {
  if (node === blockElement) {
    return Math.min(offset, blockElement.textContent?.length ?? 0)
  }

  if (node?.nodeType === Node.TEXT_NODE) {
    return Math.min(offset, node.textContent?.length ?? 0)
  }

  return 0
}

const restoreSelection = (
  root: HTMLElement,
  selection: BlocksSelection | undefined,
  shouldRestoreSelection: boolean,
) => {
  if (selection === undefined || !shouldRestoreSelection) {
    return
  }

  const blockElement = root.querySelector<HTMLElement>(`[data-block-id="${selection.blockId}"]`)

  if (blockElement === null) {
    return
  }

  const textNode = getOrCreateTextNode(blockElement)
  const range = document.createRange()
  const anchorOffset = Math.min(selection.anchorOffset, textNode.textContent?.length ?? 0)
  const focusOffset = Math.min(selection.focusOffset, textNode.textContent?.length ?? 0)
  const domSelection = document.getSelection()

  range.setStart(textNode, anchorOffset)
  range.setEnd(textNode, focusOffset)
  domSelection?.removeAllRanges()
  domSelection?.addRange(range)
}

const getOrCreateTextNode = (element: HTMLElement) => {
  const {firstChild} = element

  if (firstChild?.nodeType === Node.TEXT_NODE) {
    return firstChild
  }

  const textNode = document.createTextNode('')

  element.append(textNode)

  return textNode
}

const renderRemoteCursors = (
  root: HTMLElement,
  cursorLayer: HTMLElement,
  users: readonly BlocksPresenceUser[],
) => {
  cursorLayer.replaceChildren(
    ...users
      .filter((user) => !user.isLocal && user.selection !== undefined)
      .map((user) => createRemoteCursor(root, user))
      .filter((cursor): cursor is HTMLDivElement => cursor !== undefined),
  )
}

const createRemoteCursor = (
  root: HTMLElement,
  user: BlocksPresenceUser,
): HTMLDivElement | undefined => {
  const blockElement = root.querySelector<HTMLElement>(
    `[data-block-id="${user.selection?.blockId}"]`,
  )

  if (blockElement === null || user.selection === undefined) {
    return undefined
  }

  const blockRect = blockElement.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  const textNode = getOrCreateTextNode(blockElement)
  const offset = Math.min(user.selection.focusOffset, textNode.textContent?.length ?? 0)
  const range = document.createRange()

  range.setStart(textNode, offset)
  range.collapse(true)

  const rect = range.getBoundingClientRect()
  const cursor = document.createElement('div')
  const label = document.createElement('div')
  const left = (rect.width === 0 && rect.height === 0 ? blockRect.left : rect.left) - rootRect.left
  const top = blockRect.top - rootRect.top + CURSOR_TOP_OFFSET

  cursor.className = 'winter-blocks-editor__remote-cursor'
  cursor.style.backgroundColor = user.color
  cursor.style.left = `${String(left)}px`
  cursor.style.top = `${String(top)}px`
  label.className = 'winter-blocks-editor__remote-label'
  label.style.backgroundColor = user.color
  label.textContent = user.name
  cursor.append(label)

  return cursor
}

const updateWorkspaceSelection = (
  workspace: BlocksEditorOptions['workspace'],
  selection: BlocksSelection | undefined,
) => {
  if (isCollaborativeWorkspace(workspace)) {
    workspace.setSelection(selection)
  }
}

const getWorkspaceUsers = (workspace: BlocksEditorOptions['workspace']) => {
  if (isCollaborativeWorkspace(workspace)) {
    return workspace.getUsers()
  }

  return []
}

const subscribeWorkspaceUsers = (
  workspace: BlocksEditorOptions['workspace'],
  listener: (users: readonly BlocksPresenceUser[]) => void,
) => {
  if (isCollaborativeWorkspace(workspace)) {
    return workspace.subscribeUsers(listener)
  }

  return undefined
}

const isCollaborativeWorkspace = (
  workspace: BlocksEditorOptions['workspace'],
): workspace is CollaborativeBlocksWorkspace =>
  'setSelection' in workspace && 'getUsers' in workspace && 'subscribeUsers' in workspace
