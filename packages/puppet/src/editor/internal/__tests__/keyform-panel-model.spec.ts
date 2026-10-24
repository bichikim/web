/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createKeyformPanelModel} from '../keyform-panel-model'

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
