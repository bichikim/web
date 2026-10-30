/** @vitest-environment jsdom */
import {onCleanup} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'
import type {PuppetEditorProps} from '../../editor/types'
import {createEditorControl} from '../../editor/create-editor-control'
import {createDemoDocument, type PuppetDocument} from '../../player'
import {PUPPET_EDITOR_TAG_NAME, PuppetEditorElement} from '../index'

const mocks = vi.hoisted(() => ({dispose: vi.fn(), editor: vi.fn(), unpack: vi.fn()}))
vi.mock('../../editor/internal/texture-atlas-canvas', () => ({unpackTextureAtlas: mocks.unpack}))
vi.mock('../../editor/PuppetEditor', () => ({
  PuppetEditor: (props: PuppetEditorProps) => {
    mocks.editor(props)
    onCleanup(mocks.dispose)
    const control = createEditorControl({
      model: props.model,
      ownerId: 'test-editor',
      read: () => ({
        appliedMode: 'modeling',
        hasTemporaryChanges: false,
        mode: 'modeling',
        modePending: false,
        panels: {bottom: true, left: true, right: true},
        renderer: 'ready',
      }),
      resetSelection: () => undefined,
      selectMode: () => undefined,
      setPanelOpen: () => undefined,
      stop: () => undefined,
    })
    props.onControl?.(control)
    return <div />
  },
}))

const connect = () => {
  const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
  document.body.append(element)
  return element
}
const binding = () => (mocks.editor.mock.lastCall?.[0] as PuppetEditorProps).model
const replacement = () => ({...createDemoDocument(), framesPerSecond: 48})

const pendingDocument = () => {
  let resolve!: (document: PuppetDocument) => void
  let reject!: (error: Error) => void
  const promise = new Promise<PuppetDocument>((done, fail) => {
    resolve = done
    reject = fail
  })
  return {promise, reject, resolve}
}

const packedDocument = (): PuppetDocument => {
  const source = createDemoDocument()
  return {
    ...source,
    parts: source.parts.map((part) => ({
      ...part,
      texture: {
        ...part.texture,
        region: {height: part.texture.height, width: part.texture.width, x: 0, y: 0},
      },
    })),
  }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.clearAllMocks()
})

describe('PuppetEditorElement', () => {
  test('should validate and detach command replacement inputs', () => {
    const element = connect()
    const input = replacement()
    expect(element.control?.commands.replaceDocument(input)).toMatchObject({ok: true})
    Object.assign(input, {framesPerSecond: 96})
    expect(element.document.framesPerSecond).toBe(48)
    const result = element.control?.commands.replaceDocument(null as unknown as PuppetDocument)
    expect(result).toEqual({error: {code: 'invalid-document'}, ok: false})
    expect(element.document.framesPerSecond).toBe(48)
    expect(element.state.error).toEqual({code: 'invalid-document'})
  })

  test('should commit atlas preparation after initialization as one separate undo step', async () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const source = packedDocument()
    const prepared = createDemoDocument()
    const pending = pendingDocument()
    mocks.unpack.mockReturnValueOnce(pending.promise)
    element.document = source
    const events: string[] = []
    element.addEventListener('puppet-document-change', () => events.push('document'))
    element.addEventListener('puppet-document-commit', () => events.push('commit'))
    document.body.append(element)
    expect(events).toEqual(['document'])
    expect(element.control?.getState().undoCount).toBe(0)
    pending.resolve(prepared)
    await pending.promise
    expect(events).toEqual(['document', 'document', 'commit'])
    expect(element.control?.getState().undoCount).toBe(1)
    element.control?.commands.undo()
    expect(element.document).toEqual(source)
  })

  test('should ignore atlas preparation after a reset or reconnection', async () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const pending = pendingDocument()
    mocks.unpack.mockReturnValueOnce(pending.promise)
    element.document = packedDocument()
    document.body.append(element)
    element.document = replacement()
    element.remove()
    document.body.append(element)
    pending.resolve(createDemoDocument())
    await pending.promise
    expect(element.document.framesPerSecond).toBe(48)
    expect(element.control?.getState().undoCount).toBe(0)
  })

  test('should retain the input atlas and expose preparation failure', async () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const pending = pendingDocument()
    mocks.unpack.mockReturnValueOnce(pending.promise)
    const source = packedDocument()
    element.document = source
    document.body.append(element)
    pending.reject(new Error('Image decoding failed'))
    await pending.promise.catch(() => undefined)
    expect(element.document).toEqual(source)
    expect(element.state.error).toEqual({code: 'document-prepare-failed'})
    expect(element.control?.getState().undoCount).toBe(0)
  })

  test('should register and emit initial document before state without a commit', () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const events: string[] = []
    element.addEventListener('puppet-document-change', (event) => {
      events.push('document')
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
      expect(element.control).toBeDefined()
    })
    element.addEventListener('puppet-state-change', () => events.push('state'))
    element.addEventListener('puppet-document-commit', () => events.push('commit'))
    document.body.append(element)
    expect(element).toBeInstanceOf(PuppetEditorElement)
    expect(element.shadowRoot).not.toBeNull()
    expect(events).toEqual(['document', 'state'])
  })

  test('should detach input documents, getters, exports and event payloads from the host model', () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const input = createDemoDocument()
    element.document = input
    Object.assign(input, {framesPerSecond: 48})
    expect(element.document.framesPerSecond).not.toBe(48)
    element.addEventListener('puppet-document-change', (event) => {
      Object.assign((event as CustomEvent).detail, {framesPerSecond: 60})
    })
    document.body.append(element)
    Object.assign(element.document, {framesPerSecond: 96})
    Object.assign(element.exportDocument(), {framesPerSecond: 120})
    expect(element.document.framesPerSecond).not.toBe(60)
    expect(element.document.framesPerSecond).not.toBe(96)
    expect(element.document.framesPerSecond).not.toBe(120)
    expect(element.exportDocument()).not.toBe(element.document)
  })

  test('should preserve the current document and report invalid input before and after connection', () => {
    const element = document.createElement(PUPPET_EDITOR_TAG_NAME)
    const changed = vi.fn()
    const state = vi.fn()
    element.addEventListener('puppet-document-change', changed)
    element.addEventListener('puppet-state-change', state)
    expect(() => Reflect.set(element, 'document', null)).not.toThrow()
    expect(element.state).toEqual({editor: null, error: {code: 'invalid-document'}})
    expect(changed).not.toHaveBeenCalled()
    document.body.append(element)
    const previous = element.document
    changed.mockClear()
    expect(() => Reflect.set(element, 'document', {parts: []})).not.toThrow()
    expect(element.document).toEqual(previous)
    expect(changed).not.toHaveBeenCalled()
    expect(element.state.error).toEqual({code: 'invalid-document'})
    element.document = replacement()
    expect(element.state.error).toBeNull()
    expect(state).toHaveBeenCalled()
  })

  test('should make replacement undoable and reset history on every valid setter', () => {
    const element = connect()
    const commits = vi.fn()
    const changed = vi.fn()
    element.addEventListener('puppet-document-commit', commits)
    element.addEventListener('puppet-document-change', changed)
    element.control?.commands.replaceDocument(replacement())
    expect(element.control?.getState().canUndo).toBe(true)
    expect(commits).toHaveBeenCalledOnce()
    const same = element.document
    element.document = same
    expect(element.control?.getState().canUndo).toBe(false)
    expect(commits).toHaveBeenCalledOnce()
    expect(changed).toHaveBeenCalledTimes(2)
  })

  test('should publish a transaction commit once without duplicating the document update', () => {
    const element = connect()
    const events: string[] = []
    const model = binding()
    const origin = {ownerId: 'test-editor', requestId: 'gesture', transactionId: 'gesture'}
    element.addEventListener('puppet-document-change', () => events.push('document'))
    element.addEventListener('puppet-document-commit', (event) => {
      events.push('commit')
      const {change} = (event as CustomEvent).detail
      expect(change.origin).not.toHaveProperty('document')
    })
    model.request({...origin, type: 'begin'})
    model.request({
      ...origin,
      document: replacement(),
      expectedRevision: model.read().revision,
      type: 'edit',
    })
    model.request({...origin, type: 'commit'})
    expect(events).toEqual(['document', 'commit'])
  })

  test('should roll back the released owner and reconnect with a new control and empty history', () => {
    const element = connect()
    const old = element.control!
    const original = element.document
    const model = binding()
    const origin = {ownerId: 'test-editor', requestId: 'gesture', transactionId: 'gesture'}
    model.request({...origin, type: 'begin'})
    model.request({...origin, document: replacement(), expectedRevision: 0, type: 'edit'})
    const commits = vi.fn()
    element.addEventListener('puppet-document-commit', commits)
    element.remove()
    expect(element.document).toEqual(original)
    expect(element.exportDocument()).toEqual(original)
    expect(element.control).toBeUndefined()
    expect(element.state.editor).toBeNull()
    expect(old.commands.undo()).toEqual({reason: 'stale-instance', status: 'rejected'})
    expect(mocks.dispose).toHaveBeenCalledOnce()
    document.body.append(element)
    expect(element.control).not.toBe(old)
    expect(element.control?.getState().canUndo).toBe(false)
    expect(commits).not.toHaveBeenCalled()
  })

  test('should stop old commit callbacks after a document listener resets the model', () => {
    const element = connect()
    const commits = vi.fn()
    const final = createDemoDocument()
    element.addEventListener('puppet-document-commit', commits)
    element.addEventListener(
      'puppet-document-change',
      () => {
        element.document = final
      },
      {once: true},
    )
    element.control?.commands.replaceDocument(replacement())
    expect(element.document).toEqual(final)
    expect(element.control?.getState().canUndo).toBe(false)
    expect(commits).not.toHaveBeenCalled()
  })

  test('should finish closing the old root before a rollback listener reconnects the element', () => {
    const element = connect()
    const old = element.control
    const model = binding()
    const origin = {ownerId: 'test-editor', requestId: 'gesture', transactionId: 'gesture'}
    model.request({...origin, type: 'begin'})
    model.request({...origin, document: replacement(), expectedRevision: 0, type: 'edit'})
    element.addEventListener('puppet-document-change', () => document.body.append(element), {
      once: true,
    })
    element.remove()
    expect(element.isConnected).toBe(true)
    expect(element.control).not.toBe(old)
    expect(element.shadowRoot?.childElementCount).toBeGreaterThan(0)
    expect(element.control?.getState().lifecycle).toBe('active')
  })
})
