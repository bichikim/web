import {expect, test, vi} from 'vitest'
import {connectCharacterBlink} from '../blink'

test('should blink both eyes over the current motion, then release the eye blends', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let nextId = 0
  const request = (callback: FrameRequestCallback) => {
    nextId += 1
    frames.set(nextId, callback)
    return nextId
  }
  const cancel = (id: number) => frames.delete(id)
  const random = vi.fn(() => 0.5)
  const player = {setParameterBlend: vi.fn(() => true)}
  const dispose = connectCharacterBlink({frames: {cancel, request}, player, random})
  const advance = (time: number) => {
    const [id, callback] = [...frames][0]!
    frames.delete(id)
    callback(time)
  }
  advance(0)
  advance(4400)
  expect(player.setParameterBlend).not.toHaveBeenCalled()
  advance(4550)
  expect(player.setParameterBlend).toHaveBeenCalledWith('ParamEyeLOpen', {
    mode: 'multiply',
    value: 0.5,
  })
  expect(player.setParameterBlend).toHaveBeenCalledWith('ParamEyeROpen', {
    mode: 'multiply',
    value: 0.5,
  })
  advance(4625)
  expect(player.setParameterBlend).toHaveBeenLastCalledWith('ParamEyeROpen', {
    mode: 'multiply',
    value: 0,
  })
  advance(4725)
  expect(player.setParameterBlend).toHaveBeenLastCalledWith('ParamEyeROpen', {
    mode: 'multiply',
    value: 0.5,
  })
  advance(4800)
  expect(player.setParameterBlend).toHaveBeenLastCalledWith('ParamEyeROpen')
  expect(random).toHaveBeenCalledTimes(2)
  dispose()
  expect(frames.size).toBe(0)
})

test('should cancel a blink and release both eyes when playback stops or the character unmounts', () => {
  const request = vi.fn().mockReturnValue(7)
  const cancel = vi.fn()
  const player = {setParameterBlend: vi.fn(() => true)}
  const dispose = connectCharacterBlink({
    frames: {cancel, request},
    player,
    random: () => 0.5,
  })
  dispose()
  expect(cancel).toHaveBeenCalledWith(7)
  expect(player.setParameterBlend.mock.calls).toEqual([['ParamEyeLOpen'], ['ParamEyeROpen']])
})

// Each connection chooses its own interval without sharing random or frame globals.
test.each([
  {gap: 3000, random: 0},
  {gap: 6000, random: 1},
])('should start closing after the supplied random gap ($gap ms)', ({gap, random}) => {
  let advance: FrameRequestCallback = () => {
    throw new Error('No blink frame scheduled')
  }
  const request = (callback: FrameRequestCallback) => {
    advance = callback
    return 1
  }
  const player = {setParameterBlend: vi.fn(() => true)}
  const dispose = connectCharacterBlink({
    frames: {cancel: vi.fn(), request},
    player,
    random: () => random,
  })
  advance(0)
  advance(gap - 1)
  expect(player.setParameterBlend).not.toHaveBeenCalled()
  advance(gap + 50)
  expect(player.setParameterBlend).toHaveBeenCalledWith('ParamEyeLOpen', {
    mode: 'multiply',
    value: 0.5,
  })
  dispose()
})
