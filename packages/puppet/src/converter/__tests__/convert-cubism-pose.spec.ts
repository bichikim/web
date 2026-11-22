import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument} from '../../player/document'
import {parseDocumentValue} from '../../player/parse-document'
import {convertCubismPose} from '../convert-cubism-pose'

const demo = createDemoDocument()
const document: PuppetDocument = {
  ...demo,
  scene: {
    roots: demo.parts.map((part, index) => ({
      children: [{id: part.id, kind: 'part', locked: false, name: part.id, visible: true}],
      id: `arm-${index}`,
      kind: 'group',
      locked: false,
      name: `Arm ${index}`,
      visible: true,
    })),
  },
}
const groups = [[{Id: 'arm-0'}], [{Id: 'arm-1'}]]

test.each([
  [undefined, 0.5],
  [-1, 0.5],
  [-0.125, 0.5],
  [-Number.MIN_VALUE, 0.5],
  [-Number.MAX_VALUE, 0.5],
  [0, 0],
  [0.125, 0.125],
  [2, 2],
  [Number.MAX_VALUE, Number.MAX_VALUE],
])('should convert FadeInTime %s to %s seconds in every pose group', (fadeTime, expected) => {
  const source = {Groups: groups, ...(fadeTime === undefined ? {} : {FadeInTime: fadeTime})}
  const converted = convertCubismPose(source, document)

  expect(converted.poseGroups.map((group) => group.fadeTime)).toEqual([expected, expected])
  expect(converted.poseGroups.map((group) => group.entries[0]?.partIds)).toEqual(
    demo.parts.slice(0, 2).map((part) => [part.id]),
  )
  expect(parseDocumentValue({...document, ...converted}).ok).toBe(true)
  expect(source).toEqual({
    Groups: groups,
    ...(fadeTime === undefined ? {} : {FadeInTime: fadeTime}),
  })
})

test.each([NaN, Infinity, -Infinity, null, '0.5', {}, []])(
  'should reject invalid FadeInTime %s without normalizing it',
  (fadeTime) => {
    expect(() => convertCubismPose({FadeInTime: fadeTime, Groups: groups}, document)).toThrow(
      'Cubism JSON number is missing or invalid',
    )
  },
)
