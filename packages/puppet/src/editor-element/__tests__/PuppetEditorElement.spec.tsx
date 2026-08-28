/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import type {PuppetEditorProps} from '../../editor'
import {createDemoDocument} from '../../player'
import {PUPPET_EDITOR_TAG_NAME, PuppetEditorElement} from '../index'

const mocks = vi.hoisted(() => ({
  PuppetEditor: vi.fn(),
}))

vi.mock('../../editor', () => ({
  PuppetEditor: mocks.PuppetEditor,
}))

afterEach(() => {
  document.body.replaceChildren()
  vi.clearAllMocks()
})

describe('PuppetEditorElement', () => {
  test('should register, connect, update, and disconnect the custom element', () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const nextDocument = createDemoDocument()
    const onChange = vi.fn()

    element.addEventListener('puppet-document-change', onChange)
    document.body.append(element)

    expect(element).toBeInstanceOf(PuppetEditorElement)
    expect(element.shadowRoot).not.toBeNull()
    expect(mocks.PuppetEditor).toHaveBeenCalledOnce()

    const props = mocks.PuppetEditor.mock.calls[0]?.[0] as PuppetEditorProps | undefined
    props?.onDocumentChange?.(nextDocument)

    expect(element.document).toBe(nextDocument)
    expect(element.exportDocument()).toBe(nextDocument)
    expect(onChange).toHaveBeenCalledOnce()

    element.document = nextDocument
    expect(mocks.PuppetEditor).toHaveBeenCalledTimes(2)

    element.remove()
  })
})
