import {type Accessor, createEffect, createMemo, createSignal, on, untrack} from 'solid-js'
import type {ViewerSession} from '../shared/contracts'
import type {FileTreeNode} from './file-tree/types'
import type {ContextMenuCloseOptions, WorkspaceSelection} from './types'

interface TreeContext {
  selection: WorkspaceSelection
  x: number
  y: number
  returnFocus: HTMLElement
}
interface TreeContextMenuOptions {
  node: (path: string) => FileTreeNode | undefined
  session: Accessor<ViewerSession | null>
  visible: Accessor<boolean>
  onFocus: (path: string) => void
}

export const useTreeContextMenu = (options: TreeContextMenuOptions) => {
  const [context, setContext] = createSignal<TreeContext | null>(null)
  const sessionId = createMemo(() => options.session()?.session)
  const workspace = createMemo(() => options.session()?.workspace)
  const close = (settings?: ContextMenuCloseOptions): void => {
    const previous = context()
    setContext(null)
    if (settings?.restoreFocus !== false) {
      previous?.returnFocus.focus({preventScroll: true})
    }
  }
  createEffect(
    on([sessionId, workspace, options.visible], () => untrack(() => close({restoreFocus: false}))),
  )
  const open = (target: HTMLElement, path: string, x: number, y: number): void => {
    const current = options.session()
    const node = options.node(path)
    if (current === null || node === undefined || !options.visible()) {
      return
    }
    options.onFocus(path)
    setContext({
      returnFocus: target,
      selection: {kind: node.kind, path: `${current.workspace.replace(/\/$/u, '')}/${node.path}`},
      x,
      y,
    })
  }
  const handleContextMenu = (event: MouseEvent, path: string): void => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect()
      open(target, path, event.clientX || rect.left, event.clientY || rect.bottom)
    }
  }
  const handleKeyboard = (event: KeyboardEvent, path: string): boolean => {
    if (event.isComposing || !(event.currentTarget instanceof HTMLElement)) {
      return false
    }
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
      return false
    }
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    open(target, path, rect.right, rect.bottom)
    return true
  }
  return {close, context, handleContextMenu, handleKeyboard}
}
