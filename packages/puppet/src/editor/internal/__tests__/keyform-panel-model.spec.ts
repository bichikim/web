/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createKeyformPanelModel} from '../keyform-panel-model'
import type {PuppetParameter, PuppetParameterBinding} from '../../../player/document'
import type {PuppetParameterValues} from '../../../deformation'

test('should follow replaced parameters and values while retaining the selected binding', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const bindings = document.parameterBindings!
    const [parameters, setParameters] = createSignal(document.parameters!)
    const [values, setValues] = createSignal({'angle-x': 0, 'angle-y': 0})
    const model = createKeyformPanelModel({
      bindings,
      get parameters() {
        return parameters()
      },
      get parameterValueMap() {
        return values()
      },
    })
    expect(model.bindingParameters(bindings[0]!)[0]!.name).toBe(parameters()[0]!.name)
    setParameters(parameters().map((parameter) => ({...parameter, name: 'Renamed'})))
    expect(model.bindingParameters(bindings[0]!)[0]!.name).toBe('Renamed')
    setValues({'angle-x': 10, 'angle-y': -15})
    expect(model.bindingValues(bindings[0]!)).toEqual([10, -15])
    dispose()
  }))

test.each([
  {id: 'one', keyforms: [], parameterIds: ['angle-x']},
  {id: 'two', keyforms: [], parameterIds: ['angle-x', 'angle-y']},
  {id: 'three', keyforms: [], parameterIds: ['angle-x', 'angle-y', 'depth']},
] satisfies PuppetParameterBinding[])(
  'should preserve the axes of the $id dimensional binding',
  (binding) =>
    createRoot((dispose) => {
      const document = createDemoDocument()
      const model = createKeyformPanelModel({
        bindings: [binding],
        parameters: [
          ...document.parameters!,
          {defaultValue: 3, id: 'depth', maximum: 10, minimum: 0, name: 'Depth'},
        ],
        parameterValueMap: {'angle-x': 1, 'angle-y': 2},
      })
      expect(model.bindingValues(binding)).toEqual([1, 2, 3].slice(0, binding.parameterIds.length))
      dispose()
    }),
)

test('should leave incomplete bindings without editable values and recover when parameters return', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    const [parameters, setParameters] = createSignal<ReadonlyArray<PuppetParameter>>(
      document.parameters!.slice(1),
    )
    const model = createKeyformPanelModel({
      bindings: [binding],
      get parameters() {
        return parameters()
      },
    })
    expect(model.bindingValues(binding)).toBeUndefined()
    setParameters([])
    expect(model.bindingValues(binding)).toBeUndefined()
    setParameters(document.parameters!)
    expect(model.bindingValues(binding)).toEqual([0, 0])
    dispose()
  }))

test('should reject mismatched active values and accept a matching tuple when it changes', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    const [values, setValues] = createSignal<PuppetParameterValues>([10])
    const model = createKeyformPanelModel({
      activeBindingId: binding.id,
      bindings: [binding],
      parameters: document.parameters!,
      get values() {
        return values()
      },
    })
    expect(model.bindingValues(binding)).toBeUndefined()
    setValues([10, 20])
    expect(model.bindingValues(binding)).toBe(values())
    dispose()
  }))
