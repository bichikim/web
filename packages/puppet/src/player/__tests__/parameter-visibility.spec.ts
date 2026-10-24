import {expect, test} from 'vitest'
import {isParameterVisible} from '../parameter-visibility'
import {createDemoDocument} from '../create-demo-document'

test('should hide outside mapped keyform ranges and use defaults without an override', () => {
  const document = createDemoDocument()
  const parameter = document.parameters![0]!
  const node = {
    id: 'mesh',
    kind: 'part' as const,
    locked: false,
    name: 'mesh',
    parameterVisibility: [{maximum: 10, minimum: -10, parameterId: parameter.id}],
    visible: true,
  }
  expect(isParameterVisible(node, document)).toBe(true)
  expect(isParameterVisible(node, document, {[parameter.id]: -20})).toBe(false)
  expect(isParameterVisible({...node, visible: false}, document)).toBe(false)
})

test('should compare native Float32 boundaries after parameter clamping', () => {
  const document = {
    ...createDemoDocument(),
    parameters: [{defaultValue: 0, id: 'p', maximum: 10, minimum: -20, name: 'p'}],
  }
  const node = {
    id: 'mesh',
    kind: 'part' as const,
    locked: false,
    name: 'mesh',
    parameterVisibility: [
      {
        maximum: Math.fround(10.001),
        minimum: Math.fround(-10.001),
        parameterId: 'p',
        precision: 'float32' as const,
      },
    ],
    visible: true,
  }
  expect(isParameterVisible(node, document, {p: -10.001})).toBe(true)
  expect(isParameterVisible(node, document, {p: -10.0015})).toBe(false)
  expect(isParameterVisible(node, document, {p: 100})).toBe(true)
})
