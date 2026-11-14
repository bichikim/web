import {expect, test} from 'vitest'
import {resolveStoryFrame, type StoryCharacter, type StoryFrame} from '../frame'
import {resolveCharacterPresentation} from '../resolve-character-presentation'

const preview: StoryCharacter = {
  expressionId: '안경 쓰기',
  motionId: 'Walk:0',
  playing: true,
  scale: 1.4,
  x: -120,
  y: 80,
}
const frame: StoryFrame = {
  ...resolveStoryFrame({distance: 0.12, height: 900, width: 1440}),
  character: {
    expressionId: null,
    motionId: 'Idle:0',
    playing: true,
    scale: 0.8,
    x: 400,
    y: 180,
  },
  entrance: 0.25,
}

test('should leave inactive playground presentation under user control', () => {
  expect(resolveCharacterPresentation({frame: {...frame, active: false}, preview})).toBeUndefined()
})

test('should ease position and size from user preferences into the chapter', () => {
  const presentation = resolveCharacterPresentation({frame, preview})
  expect(presentation).toMatchObject({
    expressionId: null,
    motionId: 'Idle:0',
    playing: true,
    x: -38.75,
    y: 95.625,
  })
  expect(presentation?.scale).toBeCloseTo(1.30625)
  expect(preview.x).toBe(-120)
  expect(frame.character.x).toBe(400)
})

test('should reach the exact user and chapter placements at the entrance boundaries', () => {
  expect(
    resolveCharacterPresentation({frame: {...frame, entrance: 0, visible: false}, preview}),
  ).toEqual(preview)
  expect(resolveCharacterPresentation({frame: {...frame, entrance: 1}, preview})).toEqual(
    frame.character,
  )
})

test('should restore user expression, motion and paused playback when the chapter is hidden', () => {
  expect(
    resolveCharacterPresentation({
      frame: {...frame, visible: false},
      preview: {...preview, playing: false},
    }),
  ).toMatchObject({expressionId: '안경 쓰기', motionId: 'Walk:0', playing: false})
})

test.each([true, false])(
  'should pause during a transition when chapter visibility is %s',
  (visible) => {
    expect(
      resolveCharacterPresentation({frame: {...frame, transitioning: true, visible}, preview}),
    ).toMatchObject({playing: false})
  },
)

test('should preserve a reduced-motion chapter pose independently of user playback', () => {
  expect(
    resolveCharacterPresentation({
      frame: {...frame, character: {...frame.character, playing: false}},
      preview,
    }),
  ).toMatchObject({playing: false})
})
