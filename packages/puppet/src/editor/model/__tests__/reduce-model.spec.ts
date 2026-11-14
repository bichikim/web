import {describe, expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createModelState} from '../create-model-state'
import {reduceModel} from '../reduce-model'
import type {ModelAction, ModelState} from '../types'

const origin = {ownerId: 'editor', requestId: 'request'}
const document = createDemoDocument()
const renamed = {...document, framesPerSecond: 48}
const initial = () => createModelState({document, sessionId: 'session'})
const apply = (state: ModelState, action: ModelAction): ModelState => {
  const result = reduceModel(state, action)
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  return result.state
}
const edit = (state: ModelState): ModelState =>
  apply(state, {...origin, document: renamed, expectedRevision: state.revision, type: 'edit'})
const begin = (state: ModelState): ModelState =>
  apply(state, {...origin, transactionId: 'gesture', type: 'begin'})
const update = (state: ModelState): ModelState =>
  apply(state, {
    ...origin,
    document: renamed,
    expectedRevision: state.revision,
    transactionId: 'gesture',
    type: 'edit',
  })

describe('reduceModel', () => {
  test('should commit one history entry for multiple gesture updates', () => {
    const working = update(begin(initial()))
    expect(working.snapshots).toHaveLength(1)
    expect(working.document).toEqual(renamed)
    const result = reduceModel(working, {...origin, transactionId: 'gesture', type: 'commit'})
    expect(result).toMatchObject({change: {phase: 'commit'}, ok: true})
    if (result.ok) {
      expect(result.state.snapshots).toHaveLength(2)
      expect(result.state.transaction).toBeNull()
    }
  })

  test('should reject foreign writes and history navigation during a transaction', () => {
    const working = update(begin(initial()))
    expect(reduceModel(working, {...origin, type: 'undo'})).toEqual({
      error: {code: 'busy'},
      ok: false,
    })
    expect(
      reduceModel(working, {
        ...origin,
        document,
        expectedRevision: working.revision,
        ownerId: 'viewer',
        type: 'replace',
      }),
    ).toEqual({error: {code: 'busy'}, ok: false})
  })

  test('should restore the baseline and redo when the owning editor is released', () => {
    const undone = apply(edit(initial()), {...origin, type: 'undo'})
    const working = update(begin(undone))
    const result = reduceModel(working, {...origin, type: 'release'})
    expect(result).toMatchObject({change: {phase: 'rollback'}, ok: true})
    if (result.ok) {
      expect(result.state.document).toBe(document)
      expect(result.state.snapshots).toBe(undone.snapshots)
      expect(result.state.index).toBe(0)
      expect(result.state.revision).toBeGreaterThan(working.revision)
      expect(apply(result.state, {...origin, type: 'redo'}).document).toEqual(renamed)
      expect(reduceModel(result.state, {...origin, type: 'release'})).toMatchObject({change: null})
    }
  })

  test('should leave another owner transaction intact on release', () => {
    const working = update(begin(initial()))
    expect(reduceModel(working, {...origin, ownerId: 'viewer', type: 'release'})).toEqual({
      change: null,
      ok: true,
      state: working,
    })
  })

  test('should preserve redo for a gesture with no net change', () => {
    const undone = apply(edit(initial()), {...origin, type: 'undo'})
    const working = update(begin(undone))
    const restored = apply(working, {
      ...origin,
      document,
      expectedRevision: working.revision,
      transactionId: 'gesture',
      type: 'edit',
    })
    const result = reduceModel(restored, {...origin, transactionId: 'gesture', type: 'commit'})
    expect(result).toMatchObject({change: null, ok: true})
    if (result.ok) {
      expect(result.state.snapshots).toBe(undone.snapshots)
      expect(result.state.document).toBe(document)
    }
  })

  test('should reject a stale asynchronous result without changing state', () => {
    expect(
      reduceModel(edit(initial()), {
        ...origin,
        document,
        expectedRevision: 0,
        type: 'replace',
      }),
    ).toEqual({error: {code: 'stale-revision'}, ok: false})
  })

  test('should publish only the reset when resetting an unfinished gesture', () => {
    const working = update(begin(initial()))
    const result = reduceModel(working, {...origin, document, type: 'reset'})
    expect(result).toMatchObject({change: {kind: 'reset', phase: 'commit'}, ok: true})
    if (result.ok) {
      expect(result.state.snapshots).toHaveLength(1)
      expect(result.state.transaction).toBeNull()
      expect(result.state.document).toBe(document)
    }
  })

  test('should distinguish undo and redo across model replacement', () => {
    const replaced = apply(initial(), {
      ...origin,
      document: renamed,
      expectedRevision: 0,
      type: 'replace',
    })
    const undo = reduceModel(replaced, {...origin, type: 'undo'})
    expect(undo).toMatchObject({change: {historyKind: 'replace', kind: 'undo'}, ok: true})
    if (undo.ok) {
      expect(reduceModel(undo.state, {...origin, type: 'redo'})).toMatchObject({
        change: {historyKind: 'replace', kind: 'redo'},
        ok: true,
      })
    }
  })

  test('should keep a completed commit after release and reject a commit after cancellation', () => {
    const working = update(begin(initial()))
    const committed = apply(working, {...origin, transactionId: 'gesture', type: 'commit'})
    expect(apply(committed, {...origin, type: 'release'})).toBe(committed)
    const cancelled = apply(working, {...origin, type: 'release'})
    expect(reduceModel(cancelled, {...origin, transactionId: 'gesture', type: 'commit'})).toEqual({
      error: {code: 'transaction-missing'},
      ok: false,
    })
  })
})
