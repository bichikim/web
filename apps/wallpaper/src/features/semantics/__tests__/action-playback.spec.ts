import {expect, test, vi} from 'vitest'
import {createActionPlayback} from '../action-playback'
import type {SemanticSelection} from '../types'

test('should keep bundled actions independent and release only removed actions before disposing the bundle', () => {
  const stop = vi.fn()
  const player = {
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn<(layer: string, id?: string) => boolean>(() => true),
    startMotion: vi.fn(() => ({stop})),
  }
  const smile: SemanticSelection = {
    action: {action: {id: 'smile', kind: 'expression'}, label: '미소'},
    group: '함께',
  }
  const notes: SemanticSelection = {
    action: {action: {id: 'notes', kind: 'expression'}, label: '노트'},
    group: '함께',
  }
  const walk: SemanticSelection = {
    action: {action: {id: 'walk', kind: 'motion'}, label: '걷기'},
    group: '함께',
  }
  const playback = createActionPlayback(player)
  playback.sync([smile, notes, walk])
  const smileLayer = player.setExpressionLayer.mock.calls.find(([, id]) => id === 'smile')![0]
  const notesLayer = player.setExpressionLayer.mock.calls.find(([, id]) => id === 'notes')![0]
  expect(smileLayer).not.toBe(notesLayer)
  expect(player.setExpressionLayer.mock.calls.filter(([, id]) => id === undefined)).toEqual([])
  playback.sync([notes, walk])
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(smileLayer)
  expect(player.startMotion).toHaveBeenCalledOnce()
  expect(stop).not.toHaveBeenCalled()
  playback.dispose()
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(notesLayer)
  expect(stop).toHaveBeenCalledOnce()
})

test('should retry a rejected motion and retain only the successful playback until removal', () => {
  const stop = vi.fn()
  const player = {
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn(() => true),
    startMotion: vi
      .fn<() => {stop: () => void} | undefined>()
      .mockReturnValueOnce(undefined)
      .mockReturnValue({stop}),
  }
  const walk: SemanticSelection = {
    action: {
      action: {id: 'walk', kind: 'motion'},
      label: '걷기',
      parameterIds: ['ParamBody'],
    },
    group: 'body',
  }
  const playback = createActionPlayback(player)
  playback.sync([walk])
  expect(player.startMotion).toHaveBeenCalledTimes(1)
  playback.sync([walk])
  expect(player.startMotion).toHaveBeenCalledTimes(2)
  expect(player.startMotion).toHaveBeenLastCalledWith('walk', {loop: true})
  playback.sync([walk])
  expect(player.startMotion).toHaveBeenCalledTimes(2)
  expect(stop).not.toHaveBeenCalled()
  expect(player.resetMotionHistory).not.toHaveBeenCalled()
  playback.sync([])
  expect(stop).toHaveBeenCalledOnce()
  expect(player.resetMotionHistory).toHaveBeenCalledExactlyOnceWith(['ParamBody'])
  playback.dispose()
  expect(stop).toHaveBeenCalledOnce()
})

test('should release no motion channels after every start attempt is rejected', () => {
  const player = {
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn(() => true),
    startMotion: vi.fn(() => undefined),
  }
  const walk: SemanticSelection = {
    action: {
      action: {id: 'missing', kind: 'motion'},
      label: '걷기',
      parameterIds: ['ParamBody'],
    },
    group: 'body',
  }
  const playback = createActionPlayback(player)
  playback.sync([walk])
  playback.sync([walk])
  expect(player.startMotion).toHaveBeenCalledTimes(2)
  playback.sync([])
  playback.dispose()
  expect(player.resetMotionHistory).not.toHaveBeenCalled()
})
