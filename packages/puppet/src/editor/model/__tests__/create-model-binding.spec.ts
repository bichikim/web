/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createTrackedEffect, flush} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createModelBinding} from '../create-model-binding'
import type {ModelApplied} from '../types'

afterEach(cleanup)

const origin = {ownerId: 'host', requestId: 'request'}

test('should expose the latest snapshot during a host callback and batch reentrant writes for Solid', () => {
  const initial = createDemoDocument()
  const revisions = vi.fn()
  const onApply = vi.fn<(result: ModelApplied) => void>()
  const {result: model} = renderHook(() => {
    const binding = createModelBinding({document: initial, onApply, sessionId: 'test'})
    createTrackedEffect(() => revisions(binding.read().revision))
    return binding
  })
  onApply.mockImplementationOnce(({state, change}) => {
    expect(model.document()).toBe(state.document)
    expect(model.revision()).toBe(1)
    expect(model.read().change).toBe(change)
    expect(
      model.request({
        ...origin,
        document: {...model.document(), framesPerSecond: 60},
        expectedRevision: model.revision(),
        type: 'edit',
      }),
    ).toEqual({changed: true, ok: true, revision: 2})
  })

  expect(
    model.request({
      ...origin,
      document: {...initial, framesPerSecond: 48},
      expectedRevision: 0,
      type: 'edit',
    }),
  ).toEqual({changed: true, ok: true, revision: 1})
  expect(model.document().framesPerSecond).toBe(60)
  expect(onApply).toHaveBeenCalledTimes(2)
  expect(revisions.mock.calls).toEqual([[0]])

  flush()

  expect(revisions.mock.calls).toEqual([[0], [2]])
})

test('should publish transaction metadata without notifying document or revision readers', () => {
  const initial = createDemoDocument()
  const documents = vi.fn()
  const revisions = vi.fn()
  const views = vi.fn()
  const onApply = vi.fn()
  const transaction = {...origin, transactionId: 'gesture'}
  const {result: model} = renderHook(() => {
    const binding = createModelBinding({document: initial, onApply, sessionId: 'test'})
    createTrackedEffect(() => documents(binding.document()))
    createTrackedEffect(() => revisions(binding.revision()))
    createTrackedEffect(() => views(binding.read()))
    return binding
  })
  model.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  flush()
  const {change} = model.read()

  expect(model.request({...transaction, type: 'begin'})).toEqual({
    changed: false,
    ok: true,
    revision: 1,
  })
  flush()
  expect(views).toHaveBeenLastCalledWith(
    expect.objectContaining({transaction: expect.objectContaining({id: 'gesture'})}),
  )
  expect(model.read().change).toBe(change)

  expect(model.request({...transaction, type: 'begin'})).toEqual({error: {code: 'busy'}, ok: false})
  flush()
  expect(views).toHaveBeenCalledTimes(3)

  expect(model.request({...transaction, type: 'commit'})).toEqual({
    changed: false,
    ok: true,
    revision: 1,
  })
  flush()
  expect(views).toHaveBeenCalledTimes(4)
  expect(views).toHaveBeenLastCalledWith(expect.objectContaining({transaction: null}))
  expect(model.read().change).toBe(change)
  expect(documents).toHaveBeenCalledTimes(2)
  expect(revisions).toHaveBeenCalledTimes(2)
  expect(onApply).toHaveBeenCalledOnce()
})
