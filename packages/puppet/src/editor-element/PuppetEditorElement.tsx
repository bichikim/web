import {hasTextureAtlas} from '../editor/internal/texture-atlas'
import {unpackTextureAtlas} from '../editor/internal/texture-atlas-canvas'
import {createEffect, createSignal, untrack} from 'solid-js'
import {render} from 'solid-js/web'
import {PuppetEditor} from '../editor/PuppetEditor'
import type {EditorController, EditorState} from '../editor/control'
import type {ModelApplied, ModelBinding, ModelChange} from '../editor/model'
import {EditorPortalProvider} from '../design-system'
import {createEmptyDocument, parseDocumentValue, type PuppetDocument} from '../player'
import {createElementModel} from './create-element-model'

export const PUPPET_EDITOR_TAG_NAME = 'puppet-editor'

export interface PuppetEditorElementState {
  readonly editor: EditorState | null
  readonly error: {readonly code: 'invalid-document' | 'document-prepare-failed'} | null
}

export interface PuppetEditorElementControl {
  readonly commands: EditorController['commands']
  readonly getState: EditorController['getState']
  readonly lifecycle: Omit<EditorController['lifecycle'], 'dispose'>
}

export interface PuppetDocumentCommit {
  readonly document: PuppetDocument
  readonly change: ModelChange
}

interface ElementConnection {
  readonly id: string
  model: ModelBinding | null
  control: EditorController | undefined
  boundControl: PuppetEditorElementControl | undefined
  dispose: (() => void) | null
  opening: boolean
  closing: boolean
  preparingRevision: number | null
}

export class PuppetEditorElement extends HTMLElement {
  #currentDocument = createEmptyDocument()
  #connection: ElementConnection | null = null
  #error: PuppetEditorElementState['error'] = null
  #publishedState = ''
  #sequence = 0

  get document(): PuppetDocument {
    return structuredClone(this.#currentDocument)
  }

  set document(value: PuppetDocument) {
    const parsed = this.#parseInput(value)
    if (parsed === null) {
      this.#error = {code: 'invalid-document'}
      this.#publishState(true)
      return
    }
    this.#error = null
    const connection = this.#connection
    if (connection === null || connection.closing || connection.model === null) {
      this.#currentDocument = parsed
      this.#publishState()
      return
    }
    this.#sequence += 1
    connection.model.request({
      document: parsed,
      ownerId: connection.id,
      requestId: `reset:${this.#sequence}`,
      type: 'reset',
    })
  }

  get control(): PuppetEditorElementControl | undefined {
    const connection = this.#connection
    return connection === null || connection.closing ? undefined : connection.boundControl
  }

  get state(): PuppetEditorElementState {
    return structuredClone({editor: this.control?.getState() ?? null, error: this.#error})
  }

  connectedCallback(): void {
    if (this.#connection !== null || !this.isConnected) {
      return
    }
    const connection: ElementConnection = {
      boundControl: undefined,
      closing: false,
      control: undefined,
      dispose: null,
      id: crypto.randomUUID(),
      model: null,
      opening: true,
      preparingRevision: null,
    }
    this.#connection = connection
    const shadow = this.shadowRoot ?? this.attachShadow({mode: 'open'})
    connection.dispose = render(() => {
      const [control, setControl] = createSignal<EditorController>()
      const model = createElementModel({
        document: this.#currentDocument,
        onApply: (result) => this.#publishDocument(connection, result),
        sessionId: connection.id,
      })
      connection.model = model
      createEffect(() => {
        control()?.getState()
        model.read()
        untrack(() => {
          if (!connection.opening && !connection.closing && this.#connection === connection) {
            this.#publishState()
          }
        })
      })
      return (
        <EditorPortalProvider mount={shadow}>
          <PuppetEditor
            model={model}
            onControl={(control) => {
              const bound = this.#bindControl(connection, control)
              connection.control = control
              connection.boundControl = bound
              setControl(control)
            }}
          />
        </EditorPortalProvider>
      )
    }, shadow)
    connection.opening = false
    const revision = connection.model?.read().revision
    this.#emit('puppet-document-change', this.document)
    if (this.#connection === connection && connection.model?.read().revision === revision) {
      this.#publishState()
      this.#prepareDocument(connection)
    }
  }

  disconnectedCallback(): void {
    const connection = this.#connection
    if (connection === null || connection.closing) {
      return
    }
    connection.closing = true
    connection.control?.lifecycle.dispose()
    // Release a gesture even if mounting failed before providing a control handle.
    const transaction = connection.model?.read().transaction
    if (transaction !== null && transaction !== undefined) {
      connection.model?.request({
        ownerId: transaction.ownerId,
        requestId: 'disconnect',
        type: 'release',
      })
    }
    connection.dispose?.()
    connection.dispose = null
    if (this.#connection === connection) {
      this.#connection = null
      if (this.isConnected) {
        this.connectedCallback()
      } else {
        this.#publishState()
      }
    }
  }

  exportDocument(): PuppetDocument {
    return this.document
  }

  #parseInput(value: unknown): PuppetDocument | null {
    try {
      const copy: unknown = structuredClone(value)
      JSON.stringify(copy)
      const result = parseDocumentValue(copy)
      return result.ok ? result.document : null
    } catch {
      return null
    }
  }

  #publishDocument(connection: ElementConnection, result: ModelApplied): void {
    if (this.#connection !== connection || connection.opening || result.change === null) {
      return
    }
    const previous = this.#currentDocument
    this.#currentDocument = result.state.document
    const revision = result.state.revision
    const current = () =>
      this.#connection === connection && connection.model?.read().revision === revision
    if (previous !== this.#currentDocument || result.change.kind === 'reset') {
      this.#emit('puppet-document-change', this.document)
    }
    if (!current()) {
      return
    }
    if (!connection.closing && result.change.phase === 'commit' && result.change.kind !== 'reset') {
      this.#emit<PuppetDocumentCommit>('puppet-document-commit', {
        change: structuredClone(result.change),
        document: this.document,
      })
    }
    if (current() && !connection.closing) {
      this.#publishState(result.change.kind === 'reset')
      if (result.change.kind === 'reset' || result.change.kind === 'replace') {
        this.#prepareDocument(connection)
      }
    }
  }

  #bindControl(
    connection: ElementConnection,
    control: EditorController,
  ): PuppetEditorElementControl {
    return {
      commands: {
        ...control.commands,
        replaceDocument: (input, expected) => {
          if (
            this.#connection !== connection ||
            connection.closing ||
            control.getState().lifecycle === 'disposed'
          ) {
            return {reason: 'stale-instance', status: 'rejected'}
          }
          const document = this.#parseInput(input)
          if (document === null) {
            this.#error = {code: 'invalid-document'}
            this.#publishState(true)
            return {error: {code: 'invalid-document'}, ok: false}
          }
          this.#error = null
          const result = control.commands.replaceDocument(document, expected)
          this.#publishState()
          return result
        },
      },
      getState: control.getState,
      lifecycle: {
        activate: control.lifecycle.activate,
        deactivate: control.lifecycle.deactivate,
        resume: control.lifecycle.resume,
        suspend: control.lifecycle.suspend,
      },
    }
  }

  #prepareDocument(connection: ElementConnection): void {
    const model = connection.model
    if (model === null || connection.closing || this.#connection !== connection) {
      return
    }
    const document = model.document()
    const revision = model.revision()
    if (!hasTextureAtlas(document) || connection.preparingRevision === revision) {
      return
    }
    connection.preparingRevision = revision
    const current = () =>
      this.#connection === connection && !connection.closing && model.revision() === revision
    const fail = () => {
      if (current()) {
        this.#error = {code: 'document-prepare-failed'}
        this.#publishState(true)
      }
    }
    unpackTextureAtlas(document).then((prepared) => {
      if (!current() || prepared === document) {
        return
      }
      const result = model.request({
        document: prepared,
        expectedRevision: revision,
        ownerId: connection.id,
        requestId: `prepare:${revision}`,
        title: '텍스처 아틀라스 해제',
        type: 'replace',
      })
      if (!result.ok) {
        fail()
      }
    }, fail)
  }

  #publishState(force = false): void {
    if (this.#connection?.closing === true) {
      return
    }
    const state = this.state
    const serialized = JSON.stringify(state)
    if (force || serialized !== this.#publishedState) {
      this.#publishedState = serialized
      this.#emit('puppet-state-change', state)
    }
  }

  #emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, {bubbles: true, composed: true, detail}))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'puppet-editor': PuppetEditorElement
  }
}
