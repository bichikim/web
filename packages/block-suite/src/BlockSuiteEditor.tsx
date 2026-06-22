import {PageEditorBlockSpecs} from '@blocksuite/blocks'
import {effects as registerBlocksEffects} from '@blocksuite/blocks/effects'
import {BlockStdScope, type EditorHost, type ExtensionType} from '@blocksuite/block-std'
import {type Doc} from '@blocksuite/store'
import {createEffect, createSignal, type JSX, onCleanup, splitProps} from 'solid-js'

export interface BlockSuiteEditorProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  readonly doc: Doc
  readonly specs?: ExtensionType[]
}

let blockSuiteElementsRegistered = false

const ensureBlockSuiteElementsRegistered = () => {
  if (blockSuiteElementsRegistered || typeof globalThis.customElements === 'undefined') {
    return
  }

  if (customElements.get('editor-host') === undefined) {
    registerBlocksEffects()
  }

  blockSuiteElementsRegistered = true
}

export const BlockSuiteEditor = (props: BlockSuiteEditorProps) => {
  const [local, elementProps] = splitProps(props, ['doc', 'specs'])
  const [container, setContainer] = createSignal<HTMLDivElement>()
  let editor: EditorHost | undefined
  let remoteRefreshId = 0
  let remoteRefreshScheduled = false

  createEffect(() => {
    const element = container()

    if (element === undefined) {
      return
    }

    ensureBlockSuiteElementsRegistered()

    const renderEditor = (doc = local.doc) => {
      const std = new BlockStdScope({
        doc,
        extensions: local.specs ?? PageEditorBlockSpecs,
      })
      editor = std.render()
      element.append(editor)
    }

    const refreshRemoteEditor = () => {
      remoteRefreshScheduled = false
      const blockCollection = local.doc.collection.getBlockCollection(local.doc.id)
      const nextDoc = blockCollection?.getDoc({
        query: {
          match: [
            {
              id: `__remote_refresh_${remoteRefreshId}`,
              viewType: 'display' as never,
            },
          ],
          mode: 'loose',
        },
      })
      remoteRefreshId += 1

      if (nextDoc === undefined || nextDoc === null) {
        requestEditorUpdate(editor)
        return
      }

      editor?.remove()
      renderEditor(nextDoc)
    }

    const scheduleRemoteEditorRefresh = () => {
      if (remoteRefreshScheduled) {
        return
      }

      remoteRefreshScheduled = true
      queueMicrotask(refreshRemoteEditor)
    }

    const handleSpaceDocUpdate = (
      _update: Uint8Array,
      _origin: unknown,
      _doc: unknown,
      transaction?: {readonly local: boolean},
    ) => {
      if (transaction?.local === true) {
        return
      }

      scheduleRemoteEditorRefresh()
    }

    renderEditor()
    local.doc.spaceDoc.on('update', handleSpaceDocUpdate)

    const blockUpdatedDisposable = local.doc.slots.blockUpdated.on(() => {
      requestEditorUpdate(editor)
    })

    onCleanup(() => {
      local.doc.spaceDoc.off('update', handleSpaceDocUpdate)
      blockUpdatedDisposable.dispose()
      editor?.remove()
      editor = undefined
    })
  })

  return <div {...elementProps} ref={setContainer} />
}

const requestEditorUpdate = (editor: EditorHost | undefined) => {
  if (editor === undefined) {
    return
  }

  editor.requestUpdate()

  for (const element of editor.querySelectorAll('*')) {
    const candidate = element as Partial<{requestUpdate(): void}>
    candidate.requestUpdate?.()
  }
}
