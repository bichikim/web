import {expect, test} from 'vitest'
import {filterCubismReferences} from '../filter-cubism-references'

test('should remove absent optional references and retain existing files without mutating the source', () => {
  const references = {
    Expressions: [
      {File: 'missing.exp3.json', Name: 'missing'},
      {File: 'smile.exp3.json', Name: 'smile'},
    ],
    Moc: 'avatar.moc3',
    Physics: 'missing.physics3.json',
    Pose: 'pose.json',
    Textures: ['texture.png'],
  }
  const entries = new Map(
    ['model/pose.json', 'model/smile.exp3.json'].map((path) => [path, new Uint8Array()]),
  )
  const result = filterCubismReferences(entries, 'model/avatar.model3.json', references)
  expect(result.Physics).toBeUndefined()
  expect(result.Pose).toBe('pose.json')
  expect(result.Moc).toBe('avatar.moc3')
  expect(result.Textures).toEqual(['texture.png'])
  expect(result.Expressions).toEqual([{File: 'smile.exp3.json', Name: 'smile'}])
  expect(references.Physics).toBe('missing.physics3.json')
  expect(references.Expressions).toHaveLength(2)
})

test('should retain a silent motion when only its audio is missing and preserve available audio', () => {
  const entries = new Map(['motion.json', 'voice.wav'].map((path) => [path, new Uint8Array()]))
  expect(
    filterCubismReferences(entries, 'avatar.model3.json', {
      Motions: {
        Idle: [
          {File: 'missing.motion3.json'},
          {FadeInTime: 0.5, File: 'motion.json', Sound: 'missing.wav'},
          {File: 'motion.json', Sound: 'voice.wav'},
        ],
      },
    }).Motions,
  ).toEqual({
    Idle: [
      {FadeInTime: 0.5, File: 'motion.json'},
      {File: 'motion.json', Sound: 'voice.wav'},
    ],
  })
})
