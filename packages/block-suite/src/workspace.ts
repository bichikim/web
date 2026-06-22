import {AffineSchemas} from '@blocksuite/blocks/schemas'
import {type Doc, DocCollection, Schema, Text} from '@blocksuite/store'
import {WebsocketProvider} from 'y-websocket'

export interface BlockSuiteUser {
  readonly color: string
  readonly name: string
}

export interface CreateBlockSuiteDocOptions {
  readonly id?: string
  readonly initialText?: string
  readonly title?: string
}

export interface CreateCollaborativeBlockSuiteDocOptions extends CreateBlockSuiteDocOptions {
  readonly room: string
  readonly user: BlockSuiteUser
  readonly websocketUrl: string
}

export interface BlockSuiteWorkspace {
  readonly collection: DocCollection
  readonly doc: Doc
  init(): Promise<Doc>
}

export interface CollaborativeBlockSuiteWorkspace extends BlockSuiteWorkspace {
  readonly provider: WebsocketProvider
  destroy(): void
}

const DEFAULT_TITLE = 'Shared BlockSuite Doc'
const DEFAULT_TEXT = 'Start writing with BlockSuite, SolidJS, and Yjs.'

export const createBlockSuiteWorkspace = (
  options: CreateBlockSuiteDocOptions = {},
): BlockSuiteWorkspace => {
  const schema = new Schema().register(AffineSchemas)
  const collection = new DocCollection({schema})
  collection.meta.initialize()

  const doc = collection.createDoc({id: options.id})

  return {
    collection,
    doc,
    async init() {
      await initializeDoc(doc, {
        initialText: options.initialText,
        title: options.title,
      })

      return doc
    },
  }
}

export const createCollaborativeBlockSuiteWorkspace = (
  options: CreateCollaborativeBlockSuiteDocOptions,
): CollaborativeBlockSuiteWorkspace => {
  const workspace = createBlockSuiteWorkspace({
    ...options,
    id: options.id ?? options.room,
  })
  const provider = new WebsocketProvider(
    options.websocketUrl,
    options.room,
    workspace.doc.spaceDoc,
    {
      awareness: workspace.doc.awarenessStore.awareness,
    },
  )

  provider.awareness.setLocalStateField('user', {
    color: options.user.color,
    name: options.user.name,
  })
  provider.awareness.setLocalStateField('color', options.user.color)

  const onSync = (isSynced: boolean) => {
    if (!isSynced) {
      return
    }

    initializeDoc(workspace.doc, options).catch((error: unknown) => {
      console.error('failed to initialize BlockSuite document', error)
    })
  }

  provider.on('sync', onSync)

  return {
    ...workspace,
    destroy() {
      provider.off('sync', onSync)
      provider.destroy()
    },
    provider,
  }
}

export const initializeDoc = async (doc: Doc, options: CreateBlockSuiteDocOptions = {}) => {
  await doc.load(() => {
    if (doc.root !== null) {
      return
    }

    const blockIds = getInitialBlockIds(doc.id)
    const pageBlockId = doc.addBlock(
      'affine:page',
      withBlockId(blockIds.page, {
        title: new Text(options.title ?? DEFAULT_TITLE),
      }),
    )
    doc.addBlock('affine:surface' as never, withBlockId(blockIds.surface, {}), pageBlockId)
    const noteId = doc.addBlock('affine:note' as never, withBlockId(blockIds.note, {}), pageBlockId)
    doc.addBlock(
      'affine:paragraph',
      withBlockId(blockIds.paragraph, {
        text: new Text(options.initialText ?? DEFAULT_TEXT),
      }),
      noteId,
    )
  })
}

const getInitialBlockIds = (docId: string) => ({
  note: `${docId}:note`,
  page: `${docId}:page`,
  paragraph: `${docId}:paragraph`,
  surface: `${docId}:surface`,
})

const withBlockId = <Props extends object>(id: string, props: Props) => ({
  ...props,
  id,
})
