import {expect, test} from 'vitest'
import {resolveConnection} from '../resolve-connection'
const parameters = [
  {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
  {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
]
const mapping = {
  baseline: 0.2,
  enabled: true,
  input: 'mouthOpen' as const,
  inputMaximum: 1,
  inputMinimum: 0,
  multiplier: 4,
  outputMaximum: 0,
  outputMinimum: 1,
  parameterId: 'mouth',
  smoothing: 0,
}
test('should create enabled tracking mappings and reject invalid directions', () => {
  const result = resolveConnection({
    connection: {
      source: 'tracking',
      sourceHandle: 'faceYaw',
      target: 'parameters',
      targetHandle: 'angle',
    },
    mappings: [],
    parameters,
  })
  expect(result?.mapping).toMatchObject({
    enabled: true,
    input: 'faceYaw',
    inputMinimum: -30,
    outputMinimum: -30,
    parameterId: 'angle',
  })
  expect(
    resolveConnection({
      connection: {source: 'parameters', target: 'tracking'},
      mappings: [],
      parameters,
    }),
  ).toBeUndefined()
})
test('should replace a card input while retaining gain and clearing incompatible calibration', () => {
  const result = resolveConnection({
    connection: {source: 'tracking', sourceHandle: 'eyeBlinkLeft', target: 'mapping:mouth'},
    mappings: [mapping],
    parameters,
  })
  expect(result?.mapping).toMatchObject({input: 'eyeBlinkLeft', multiplier: 4, outputMinimum: 1})
  expect(result?.mapping.baseline).toBeUndefined()
})
test('should retarget cards preserving reverse direction and refuse occupied targets', () => {
  const connection = {source: 'mapping:mouth', target: 'parameters', targetHandle: 'angle'}
  const result = resolveConnection({connection, mappings: [mapping], parameters})
  expect(result).toMatchObject({
    mapping: {
      baseline: 0.2,
      multiplier: 4,
      outputMaximum: -30,
      outputMinimum: 30,
      parameterId: 'angle',
    },
    previousId: 'mouth',
  })
  expect(
    resolveConnection({
      connection,
      mappings: [mapping, {...mapping, parameterId: 'angle'}],
      parameters,
    }),
  ).toBeUndefined()
})

test('should reconnect an unchanged port while preserving calibration', () => {
  const disconnected = {...mapping, inputConnected: false, outputConnected: false}
  expect(
    resolveConnection({
      connection: {source: 'tracking', sourceHandle: mapping.input, target: 'mapping:mouth'},
      mappings: [disconnected],
      parameters,
    })?.mapping,
  ).toMatchObject({baseline: 0.2, inputConnected: true, multiplier: 4})
  expect(
    resolveConnection({
      connection: {source: 'mapping:mouth', target: 'parameters', targetHandle: 'mouth'},
      mappings: [disconnected],
      parameters,
    })?.mapping,
  ).toMatchObject({multiplier: 4, outputConnected: true})
})

test('should connect local input groups and reject a mismatched source group', () => {
  for (const [source, input] of [
    ['manual', 'manualValue'],
    ['button', 'buttonValue'],
  ]) {
    expect(
      resolveConnection({
        connection: {
          source: source!,
          sourceHandle: input!,
          target: 'parameters',
          targetHandle: 'mouth',
        },
        mappings: [],
        parameters,
      })?.mapping,
    ).toMatchObject({enabled: true, input})
  }
  expect(
    resolveConnection({
      connection: {
        source: 'tracking',
        sourceHandle: 'manualValue',
        target: 'parameters',
        targetHandle: 'mouth',
      },
      mappings: [],
      parameters,
    }),
  ).toBeUndefined()
})

test('should reject individual inputs for broadcast members while accepting organizing members', () => {
  const connection = {
    source: 'manual',
    sourceHandle: 'manualValue',
    target: 'parameter:mouth',
    targetHandle: 'mouth',
  }
  const group = {id: 'face', name: 'Face', parameterIds: ['mouth']}
  expect(
    resolveConnection({
      connection,
      groups: [{...group, mode: 'broadcast'}],
      mappings: [],
      parameters,
    }),
  ).toBeUndefined()
  expect(
    resolveConnection({connection, groups: [{...group, mode: 'folder'}], mappings: [], parameters})
      ?.mapping.parameterId,
  ).toBe('mouth')
})
