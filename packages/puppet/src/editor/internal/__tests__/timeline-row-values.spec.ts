import {expect, test} from 'vitest'
import {createEmptyDocument, getModelTrackRowId, type PuppetDocument} from '../../../player'
import {sampleTimelineRowValues} from '../timeline-row-values'

test('should sample colliding parameter and effect rows without overwriting either value', () => {
  const document: PuppetDocument = {
    ...createEmptyDocument(),
    motions: [
      {
        duration: 1,
        id: 'motion',
        tracks: [
          {keyframes: [{time: 0, value: 8}], kind: 'parameter', parameterId: 'model:opacity'},
          {keyframes: [{time: 0, value: 0.5}], kind: 'model', target: 'opacity'},
        ],
      },
    ],
    parameters: [
      {defaultValue: 0, id: 'model:opacity', maximum: 10, minimum: 0, name: 'Parameter'},
    ],
  }
  const values = sampleTimelineRowValues({document, motion: document.motions[0], time: 0})
  expect(values['model:opacity']).toBe(8)
  expect(values[getModelTrackRowId('opacity', document)]).toBe(0.5)
})
