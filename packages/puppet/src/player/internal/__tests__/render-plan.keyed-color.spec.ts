import {describe, expect, test, vi} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import type {PuppetColorEffect} from '../../../deformation/group-properties'
import {parseDocument} from '../../parse-document'
import {getPartRenderFrame} from '../render-plan'

const sampling = vi.hoisted(() => ({everyTargetingBinding: false}))

vi.mock('../../../deformation/keyed-color-effect', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../deformation/keyed-color-effect')>()
  const keysColorEffect = (properties: Partial<PuppetColorEffect> | undefined) =>
    properties?.opacity !== undefined ||
    properties?.multiplyColor !== undefined ||
    properties?.screenColor !== undefined
  return {
    ...original,
    // Keys the rest opacity on keyforms without opacity or colors, so every targeting binding
    // is sampled as it was before such bindings were skipped.
    composeKeyedColorEffect: ((options) =>
      original.composeKeyedColorEffect(
        sampling.everyTargetingBinding
          ? {
              ...options,
              keyedProperties: (binding) =>
                options
                  .keyedProperties(binding)
                  ?.map((properties) =>
                    keysColorEffect(properties)
                      ? properties
                      : {...properties, opacity: options.rest.opacity},
                  ),
            }
          : options,
      )) satisfies typeof original.composeKeyedColorEffect,
  }
})

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

const frameWith = (
  everyTargetingBinding: boolean,
  parameterValues: Readonly<Record<string, number>>,
) => {
  sampling.everyTargetingBinding = everyTargetingBinding
  try {
    return getPartRenderFrame(model, parameterValues)
  } finally {
    sampling.everyTargetingBinding = false
  }
}

const PARAMETER_STATES: ReadonlyArray<Readonly<Record<string, number>>> = [
  {},
  {'blush-opacity': 0.7, 'eye-close-left': 0.5, 'face-x': 20, 'mouth-open': 0.6},
  {'body-x': 30, 'pallor-opacity': 0.5, 'sweat-upper-opacity': 1},
  {'arm-left-x': 10, 'eye-symbol': 1, 'face-y': -15, 'sweat-lower-opacity': 0.4},
]

describe('development model keyed colors', () => {
  test.each(PARAMETER_STATES)(
    'should render the same frame when skipping bindings without keyed colors at %o',
    (parameterValues) => {
      expect(frameWith(false, parameterValues)).toEqual(frameWith(true, parameterValues))
    },
  )
})
