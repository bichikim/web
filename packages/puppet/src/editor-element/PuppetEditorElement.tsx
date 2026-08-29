import {render} from 'solid-js/web'

import {PuppetEditor} from '../editor'
import {createDemoDocument, type PuppetDocument} from '../player'

export const PUPPET_EDITOR_TAG_NAME = 'puppet-editor'

export class PuppetEditorElement extends HTMLElement {
  #currentDocument = createDemoDocument()
  #dispose: (() => void) | null = null

  get document(): PuppetDocument {
    return this.#currentDocument
  }

  set document(document: PuppetDocument) {
    this.#currentDocument = document

    if (this.#dispose !== null) {
      this.#dispose()
      this.#dispose = null
      this.connectedCallback()
    }
  }

  connectedCallback() {
    if (this.#dispose !== null) {
      return
    }

    const shadowRoot = this.shadowRoot ?? this.attachShadow({mode: 'open'})

    this.#dispose = render(
      () => (
        <PuppetEditor
          initialDocument={this.#currentDocument}
          onDocumentChange={(nextDocument) => {
            this.#currentDocument = nextDocument
            this.dispatchEvent(
              new CustomEvent<PuppetDocument>('puppet-document-change', {
                bubbles: true,
                composed: true,
                detail: nextDocument,
              }),
            )
          }}
        />
      ),
      shadowRoot,
    )
  }

  disconnectedCallback() {
    this.#dispose?.()
    this.#dispose = null
  }

  exportDocument(): PuppetDocument {
    return this.#currentDocument
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'puppet-editor': PuppetEditorElement
  }
}
