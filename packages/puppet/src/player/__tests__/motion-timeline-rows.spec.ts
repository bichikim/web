import {expect, test} from 'vitest'

import {
  createEmptyDocument,
  getGroupOpacityRowId,
  getModelTrackRowId,
  getMotionTimelineRows,
  getTimelineRowIds,
  parseDocument,
  parseDocumentValue,
  type PuppetDocument,
  serializeDocument,
  withTimelineRowIds,
} from '..'

const createDocument = (): PuppetDocument => ({
  ...createEmptyDocument(),
  motions: [
    {
      duration: 1,
      id: 'motion',
      timelineParameterIds: ['model:opacity', 'group-opacity:group'],
      tracks: [],
    },
  ],
  parameters: ['model:opacity', 'group-opacity:group'].map((id) => ({
    defaultValue: 0,
    id,
    maximum: 10,
    minimum: 0,
    name: id,
  })),
  scene: {
    roots: [
      {children: [], id: 'group', kind: 'group', locked: false, name: 'Group', visible: true},
    ],
  },
})

test('should preserve legacy parameter IDs and persist colliding empty effect rows separately', () => {
  const legacy = createDocument()
  const loaded = parseDocumentValue(legacy)
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) {
    throw new Error('invalid fixture')
  }
  const document = loaded.document
  const motion = document.motions[0]!
  const ids = [
    ...getTimelineRowIds(document, motion),
    getModelTrackRowId('opacity', document),
    getGroupOpacityRowId('group', document),
  ]
  const saved = {...document, motions: [withTimelineRowIds(document, motion, ids)]}
  const roundtrip = parseDocument(serializeDocument(saved))
  expect(roundtrip.ok).toBe(true)
  if (!roundtrip.ok) {
    throw new Error('invalid roundtrip')
  }
  expect(roundtrip.document.parameters).toEqual(legacy.parameters)
  expect(roundtrip.document.motions[0]?.tracks).toEqual(legacy.motions[0]?.tracks)
  expect(getTimelineRowIds(roundtrip.document, roundtrip.document.motions[0]!)).toEqual(ids)
  expect(roundtrip.document.motions[0]?.timelineParameterIds).toEqual([
    'model:opacity',
    'group-opacity:group',
  ])
  expect(roundtrip.document.motions[0]?.timelineEffectRows).toEqual([
    {kind: 'model', target: 'opacity'},
    {groupId: 'group', kind: 'group-opacity'},
  ])
})

test('should read legacy model and group effect rows when no parameter uses their IDs', () => {
  const source = createDocument()
  const document = {...source, parameters: []}
  const motion = document.motions[0]!
  expect(getMotionTimelineRows(document, motion)).toEqual({
    effectRows: [
      {kind: 'model', target: 'opacity'},
      {groupId: 'group', kind: 'group-opacity'},
    ],
    parameterIds: [],
  })
  const saved = withTimelineRowIds(document, motion, getTimelineRowIds(document, motion))
  expect(saved.timelineParameterIds).toEqual([])
  expect(saved.timelineEffectRows).toHaveLength(2)
})

test('should retain the target of an empty effect row when a parameter later occupies its screen ID', () => {
  const source = createDocument()
  const document = {...source, parameters: []}
  const motion = withTimelineRowIds(document, source.motions[0]!, [
    getModelTrackRowId('opacity', document),
  ])
  const changed = {...source, motions: [motion]}
  expect(getTimelineRowIds(changed, motion)).toEqual([getModelTrackRowId('opacity', changed)])
  expect(getTimelineRowIds(changed, motion)).not.toContain('model:opacity')
})
