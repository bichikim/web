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

test('should enlarge the story character as wide screens gain vertical room', () => {
  const shortDesktop = resolveStoryFrame({distance: 1.8, height: 768, width: 1366}).character
  const tallDesktop = resolveStoryFrame({distance: 1.8, height: 1200, width: 1920}).character
  expect(shortDesktop.fit?.weight).toBe(1)
  expect(shortDesktop.fit?.width).toBeGreaterThan(500)
  expect(tallDesktop.fit?.width).toBeGreaterThan(850)
  expect(tallDesktop.y).toBeLessThan(0.06 * 1200)
})

test('should preserve phone framing and increase the fit gradually on wider screens', () => {
  const phone = resolveStoryFrame({distance: 0.3, height: 844, width: 390}).character
  const tablet = resolveStoryFrame({distance: 0.3, height: 1180, width: 820}).character
  const laptop = resolveStoryFrame({distance: 0.3, height: 820, width: 840}).character
  expect(phone.scale).toBe(2.1)
  expect(phone.y).toBeCloseTo(0.36 * 844)
  expect(phone.fit).toBeUndefined()
  expect(tablet.fit).toBeUndefined()
  expect(laptop.fit?.weight).toBeGreaterThan(0)
  expect(laptop.fit?.weight).toBeLessThan(1)
})

test('should enlarge the character in a nearly square desktop window and allow a small crop at the feet', () => {
  const height = 850
  const {fit, y} = resolveStoryFrame({distance: 0.3, height, width: 930}).character
  expect(fit?.weight).toBe(1)
  expect(fit?.width).toBeGreaterThan(650)
  const feet = height / 2 + y + 0.6 * fit!.width
  expect(feet).toBeGreaterThan(height)
  expect(feet).toBeLessThanOrEqual(height + 50)
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
