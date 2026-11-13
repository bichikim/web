/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {createElementModel} from '../../editor-element/create-element-model'
import {createDemoDocument} from '../../player'
import {createEditorControl} from '../create-editor-control'
import type {EditorMode} from '../control'

afterEach(cleanup)

const setup = () =>
  renderHook(() => {
    const model = createElementModel({document: createDemoDocument(), sessionId: 'model'})
    const [mode, setMode] = createSignal<EditorMode>('modeling')
    const [requested, setRequested] = createSignal<EditorMode>('modeling')
    const [pending, setPending] = createSignal(false)
    const [left, setLeft] = createSignal(true)
    const stop = vi.fn()
    const control = createEditorControl({
      model,
      ownerId: 'editor',
      read: () => ({
        appliedMode: mode(),
        hasTemporaryChanges: false,
        mode: requested(),
        modePending: pending(),
        panels: {bottom: true, left: left(), right: true},
        renderer: 'error',
      }),
      resetSelection: () => {
        setRequested(mode())
        setPending(false)
      },
      selectMode: (next) => {
        setRequested(next)
        setPending(next !== mode())
      },
      setPanelOpen: (_panel, open) => setLeft(open),
      stop,
    })
    return {control, model, setMode, setPending, stop}
  })

describe('createEditorControl', () => {
  test('should complete a mode operation only after the requested mode is applied', async () => {
    const {result} = setup()
    const accepted = result.control.commands.selectMode('animation')
    expect(accepted.status).toBe('accepted')
    expect(result.control.getState()).toMatchObject({
      appliedMode: 'modeling',
      mode: 'animation',
      modePending: true,
    })
    if (accepted.status !== 'accepted') {
      throw new Error('Mode request rejected')
    }
    result.setMode('animation')
    result.setPending(false)
    await expect(accepted.operation.finished).resolves.toEqual({
      status: 'completed',
      value: 'animation',
    })
  })

  test('should cancel superseded mode work and make repeated cancellation idempotent', async () => {
    const {result} = setup()
    const first = result.control.commands.selectMode('animation')
    const next = result.control.commands.selectMode('modeling')
    if (first.status !== 'accepted' || next.status !== 'accepted') {
      throw new Error('Mode request rejected')
    }
    first.operation.cancel()
    first.operation.cancel()
    await expect(first.operation.finished).resolves.toEqual({
      reason: 'superseded',
      status: 'cancelled',
    })
    await expect(next.operation.finished).resolves.toEqual({status: 'completed', value: 'modeling'})
  })

  test('should restrict editor commands while inactive without locking host replacement', () => {
    const {result} = setup()
    result.control.lifecycle.deactivate()
    expect(result.control.commands.togglePanel('left')).toEqual({
      reason: 'inactive',
      status: 'rejected',
    })
    expect(
      result.model.request({
        document: {...createDemoDocument(), framesPerSecond: 48},
        expectedRevision: 0,
        ownerId: 'viewer',
        requestId: 'replace',
        type: 'replace',
      }).ok,
    ).toBe(true)
    result.control.lifecycle.activate()
    expect(result.control.getState().canUndo).toBe(true)
    result.control.commands.setPanelOpen('left', false)
    expect(result.control.getState().panels.left).toBe(false)
  })

  test('should reject deactivation during a transaction and roll back only its owner on disposal', () => {
    const {result} = setup()
    const before = result.model.read().document
    const origin = {ownerId: 'editor', requestId: 'gesture', transactionId: 'gesture'}
    result.model.request({...origin, type: 'begin'})
    result.model.request({
      ...origin,
      document: {...before, framesPerSecond: 48},
      expectedRevision: 0,
      type: 'edit',
    })
    expect(result.control.lifecycle.deactivate()).toEqual({reason: 'busy', status: 'rejected'})
    expect(result.control.commands.undo()).toEqual({error: {code: 'busy'}, ok: false})
    result.control.lifecycle.dispose()
    result.control.lifecycle.dispose()
    expect(result.model.read().document).toBe(before)
    expect(result.model.read().transaction).toBeNull()
    expect(result.control.commands.undo()).toEqual({reason: 'stale-instance', status: 'rejected'})
  })

  test('should retain completed host history after an editor is disposed', () => {
    const {result, cleanup: dispose} = setup()
    result.control.commands.replaceDocument({...createDemoDocument(), framesPerSecond: 48})
    const count = result.model.read().undoCount
    dispose()
    expect(result.model.read().undoCount).toBe(count)
    expect(count).toBe(1)
    expect(result.control.getState().lifecycle).toBe('disposed')
  })

  test('should allow document commands when the renderer has failed', () => {
    const {result} = setup()
    expect(result.control.getState().renderer).toBe('error')
    expect(
      result.control.commands.replaceDocument({...createDemoDocument(), framesPerSecond: 48}),
    ).toMatchObject({changed: true, ok: true})
    expect(result.control.commands.undo()).toMatchObject({changed: true, ok: true})
  })
})

test('should reject a replacement prepared for an older document revision or another session', () => {
  const {result} = setup()
  const before = result.control.getState()
  result.control.commands.replaceDocument({...createDemoDocument(), framesPerSecond: 48})
  expect(result.control.commands.replaceDocument(createDemoDocument(), before)).toEqual({
    error: {code: 'stale-revision'},
    ok: false,
  })
  expect(
    result.control.commands.replaceDocument(createDemoDocument(), {
      revision: 1,
      sessionId: 'other',
    }),
  ).toEqual({error: {code: 'stale-session'}, ok: false})
  expect(result.model.document().framesPerSecond).toBe(48)
})
