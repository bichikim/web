import {expect, test} from 'vitest'

import {
  createEmptyDocument,
  createRowTrack,
  getEffectRows,
  getGroupOpacityRowId,
  getModelTrackRowId,
  getRowParameter,
  getTrackRowId,
  parseDocumentValue,
  type PuppetDocument,
  type PuppetTrack,
} from '..'

test('should refresh effect row names and collision IDs after an immutable document replacement', () => {
  const source: PuppetDocument = {
    ...createEmptyDocument(),
    scene: {
      roots: [
        {children: [], id: 'group', kind: 'group', locked: false, name: 'First', visible: true},
      ],
    },
  }
  const first = getEffectRows(source)
  expect(first.find((row) => row.id === 'group-opacity:group')?.name).toBe('First 불투명도')
  const replacement: PuppetDocument = {
    ...source,
    parameters: [
      {defaultValue: 0, id: 'group-opacity:group', maximum: 1, minimum: 0, name: 'Parameter'},
    ],
    scene: {
      roots: [
        {children: [], id: 'group', kind: 'group', locked: false, name: 'Second', visible: true},
      ],
    },
  }
  expect(
    getEffectRows(replacement).find((row) => row.id === 'effect:group-opacity:group')?.name,
  ).toBe('Second 불투명도')
  expect(getEffectRows(source)).toEqual(first)
})

const document: PuppetDocument = {
  ...createEmptyDocument(),
  motions: [{duration: 1, id: 'motion', tracks: []}],
  parameters: ['model:opacity', 'effect:model:opacity', 'effect:effect:model:opacity'].map(
    (id) => ({
      defaultValue: 0,
      id,
      maximum: 10,
      minimum: 0,
      name: id,
    }),
  ),
}

test('should edit a parameter and a model effect independently when their legacy row IDs collide', () => {
  expect(parseDocumentValue(document).ok).toBe(true)
  const parameter: PuppetTrack = {
    keyframes: [{time: 0, value: 8}],
    kind: 'parameter',
    parameterId: 'model:opacity',
  }
  const model: PuppetTrack = {keyframes: [{time: 0, value: 0.5}], kind: 'model', target: 'opacity'}
  const parameterRow = getTrackRowId(parameter, document)!
  const modelRow = getTrackRowId(model, document)!
  expect(parameterRow).toBe('model:opacity')
  expect(modelRow).not.toBe(parameterRow)
  expect(getRowParameter(document, parameterRow)?.maximum).toBe(10)
  expect(getRowParameter(document, modelRow)?.maximum).toBe(1)
  expect(createRowTrack(parameterRow, parameter.keyframes, document)).toEqual(parameter)
  expect(createRowTrack(modelRow, model.keyframes, document)).toEqual(model)
})

test('should avoid every occupied effect prefix without renaming any parameter', () => {
  const rowId = getModelTrackRowId('opacity', document)
  expect(document.parameters?.some((parameter) => parameter.id === rowId)).toBe(false)
  expect(getRowParameter(document, rowId)?.name).toBe('모델 불투명도')
  expect(getModelTrackRowId('opacity')).toBe('model:opacity')
})

test('should distinguish a group opacity row from a parameter with the legacy group row ID', () => {
  const grouped: PuppetDocument = {
    ...document,
    parameters: [
      {defaultValue: 0, id: 'group-opacity:group', maximum: 10, minimum: 0, name: 'Parameter'},
    ],
    scene: {
      roots: [
        {children: [], id: 'group', kind: 'group', locked: false, name: 'Group', visible: true},
      ],
    },
  }
  const rowId = getGroupOpacityRowId('group', grouped)
  expect(rowId).not.toBe('group-opacity:group')
  expect(getRowParameter(grouped, rowId)?.maximum).toBe(1)
  expect(createRowTrack(rowId, [{time: 0, value: 0.25}], grouped)).toEqual({
    groupId: 'group',
    keyframes: [{time: 0, value: 0.25}],
    kind: 'group-opacity',
  })
})
