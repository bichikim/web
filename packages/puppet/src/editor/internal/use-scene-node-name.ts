import {type Accessor, createSignal} from 'solid-js'
import type {PuppetDocument, PuppetSceneNode} from '../../player'
import {renameSceneNode} from './scene-graph'

interface UseSceneNodeNameProps {
  readonly document: Accessor<PuppetDocument>
  readonly node: Accessor<PuppetSceneNode>
  readonly disabled: Accessor<boolean>
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

export const useSceneNodeName = (props: UseSceneNodeNameProps) => {
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [nameDraft, setNameDraft] = createSignal('')
  let input: HTMLInputElement | undefined
  const startRenaming = () => {
    if (props.disabled()) {
      return
    }
    setNameDraft(props.node().name)
    setIsRenaming(true)
    queueMicrotask(() => {
      input?.focus()
      input?.select()
    })
  }
  const finishRenaming = () => {
    if (!isRenaming()) {
      return
    }
    const document = renameSceneNode(props.document(), props.node().id, nameDraft())
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
    setIsRenaming(false)
  }
  return {
    cancelRenaming: () => setIsRenaming(false),
    finishRenaming,
    isRenaming,
    nameDraft,
    setInput: (element: HTMLInputElement) => {
      input = element
    },
    setNameDraft,
    startRenaming,
  }
}
