import {expect, test} from 'vitest'
import {
  createEmptyDocument,
  getModelTrackRowId,
  getTimelineRowIds,
  parseDocumentValue,
  type PuppetDocument,
} from '..'

const createDocument = (): PuppetDocument => ({
  ...createEmptyDocument(),
  motions: [{duration: 1, id: 'motion', timelineParameterIds: ['model:opacity'], tracks: []}],
  parameters: [{defaultValue: 0, id: 'model:opacity', maximum: 10, minimum: 0, name: 'Parameter'}],
})

test.each(
  [
    [{kind: 'model', target: 'missing'}],
    [{kind: 'parameter', parameterId: 'model:opacity'}],
    [{groupId: 'missing', kind: 'group-opacity'}],
    [{groupId: '', kind: 'group-opacity'}],
    [
      {kind: 'model', target: 'opacity'},
      {kind: 'model', target: 'opacity'},
    ],
  ].map((rows) => [rows]),
)('should reject malformed, missing or duplicate effect rows: %j', (rows) => {
  const document = createDocument()
  expect(
    parseDocumentValue({...document, motions: [{...document.motions[0], timelineEffectRows: rows}]})
      .ok,
  ).toBe(false)
})

test('should migrate a legacy empty effect row before a later parameter can occupy its ID', () => {
  const source = createDocument()
  const loaded = parseDocumentValue({...source, parameters: []})
  expect(loaded.ok).toBe(true)
  if (!loaded.ok) {
    throw new Error('invalid fixture')
  }
  const changed = {...loaded.document, parameters: source.parameters}
  expect(getTimelineRowIds(changed, changed.motions[0]!)).toEqual([
    getModelTrackRowId('opacity', changed),
  ])
  expect(changed.motions[0]?.timelineEffectRows).toEqual([{kind: 'model', target: 'opacity'}])
})
