import {expect, test} from 'vitest'
import {resolveStoryFrame, STORY_LENGTH} from '../frame'

const frame = (distance: number) => resolveStoryFrame({distance, height: 900, width: 1440})

test('should leave the first screen under user control and cover scene changes', () => {
  expect(frame(0)).toMatchObject({active: false, visible: false})
  expect(frame(0.1)).toMatchObject({active: false, visible: false})
  expect(frame(0.12)).toMatchObject({entrance: 1, visible: true})
  expect(frame(0.3)).toEqual(frame(1.1))
  expect(frame(1.8)).toMatchObject({background: 'street-front', chapter: 1})
})

test('should use the actual miniature expression and clear it when jumping to the download scene', () => {
  expect(frame(4.7).character).toMatchObject({expressionId: '작아지기', motionId: 'Idle:0'})
  expect(frame(7).character).toMatchObject({expressionId: null, motionId: 'Idle:0'})
  expect(frame(2.5).character).toMatchObject({expressionId: null, motionId: 'Walk:0'})
})

test('should produce identical frames after reverse and fast scrolling without retaining actions', () => {
  const before = frame(3.6)
  frame(5.8)
  frame(0)
  expect(frame(3.6)).toEqual(before)
  expect(frame(3.6).character.expressionId).toBe('커피 들기')
  expect(frame(0).active).toBe(false)
})

test('should keep narrow-phone character placement inside the stage and suppress motion when requested', () => {
  const phone = resolveStoryFrame({distance: 4.7, height: 667, reducedMotion: true, width: 300})
  expect(phone.character.x).toBeGreaterThanOrEqual(-150)
  expect(phone.character.x).toBeLessThan(150)
  expect(phone.character.y).toBeLessThan(333.5)
  expect(phone.character.playing).toBe(false)
  expect(frame(STORY_LENGTH + 100).progress).toBe(1)
  expect(frame(Number.NaN).active).toBe(false)
})

test('should place the Codex speech chapter after details and before download', () => {
  expect(frame(4.7)).toMatchObject({chapter: 3, kind: 'details'})
  expect(frame(5.5)).toMatchObject({
    chapter: 4,
    character: {expressionId: null, motionId: 'Idle:0'},
    kind: 'codex',
  })
  expect(frame(7)).toMatchObject({chapter: 5, kind: 'download', progress: 1})
})
