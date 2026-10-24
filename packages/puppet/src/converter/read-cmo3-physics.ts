import type {Element} from '@xmldom/xmldom'
import {
  DEFAULT_PUPPET_CHAIN_FPS,
  type PuppetPhysics,
  type PuppetPhysicsAxis,
  type PuppetPhysicsChain,
  type PuppetPhysicsRange,
} from '../player/document-physics'
import {child, elementChildren, guid, resolve, scalar} from './cmo3-xml'

const axisOf = (element: Element, references: ReadonlyMap<string, Element>): PuppetPhysicsAxis => {
  const type = resolve(child(element, 'CPhysicsSourceType', 'type'), references)?.getAttribute('v')
  switch (type) {
    case 'SRC_TO_X':
      return 'x'
    case 'SRC_TO_Y':
      return 'y'
    case 'SRC_TO_G_ANGLE':
      return 'angle'
    default:
      throw new Error(`Unsupported CMO3 physics axis: ${type}`)
  }
}

const normalization = (
  element: Element,
  axis: 'Position' | 'Angle',
  references: ReadonlyMap<string, Element>,
): PuppetPhysicsRange => {
  const minimum = scalar(child(element, 'f', `normalized${axis}ValueMin`), references)
  const maximum = scalar(child(element, 'f', `normalized${axis}ValueMax`), references)
  const center = scalar(child(element, 'f', `normalized${axis}DefaultValue`), references)
  if (minimum === undefined || maximum === undefined || center === undefined) {
    throw new Error('CMO3 physics normalization is missing')
  }
  return {
    center,
    maximum: Math.max(minimum, maximum),
    minimum: Math.min(minimum, maximum),
  }
}

export const readCmo3Physics = (
  model: Element,
  parameters: ReadonlyMap<string, string>,
  references: ReadonlyMap<string, Element>,
): PuppetPhysics | undefined => {
  const source = resolve(
    child(model, 'CPhysicsSettingsSourceSet', 'physicsSettingsSourceSet'),
    references,
  )
  const entries = (element: Element | undefined, name: string) =>
    elementChildren(resolve(child(element, 'carray_list', name), references)).map(
      (entry) => resolve(entry, references)!,
    )
  const parameter = (element: Element, name: 'source' | 'destination'): string => {
    const id = parameters.get(guid(child(element, 'CParameterGuid', name), references) ?? '')
    if (id === undefined) {
      throw new Error('CMO3 physics parameter is missing')
    }
    return id
  }
  const percentage = 100
  const chains = entries(source, '_sourceCubismPhysics').flatMap(
    (entry): ReadonlyArray<PuppetPhysicsChain> => {
      const element = resolve(entry, references)!
      const outputs = entries(element, 'outputs')
      if (outputs.length === 0) {
        return []
      }
      const id =
        guid(child(element, 'CPhysicsSettingsGuid', 'guid'), references) ??
        child(element, 'CPhysicsSettingId', 'id')?.getAttribute('idstr')
      if (id === null || id === undefined) {
        throw new Error('CMO3 physics identifier is missing')
      }
      return [
        {
          id,
          inputs: entries(element, 'inputs').map((input) => ({
            axis: axisOf(input, references),
            parameterId: parameter(input, 'source'),
            reflect: resolve(child(input, 'b', 'isReverse'), references)?.textContent === 'true',
            weight: (scalar(child(input, 'f', 'weight'), references) ?? percentage) / percentage,
          })),
          normalization: {
            angle: normalization(element, 'Angle', references),
            position: normalization(element, 'Position', references),
          },
          outputs: outputs.map((output) => {
            const axis = axisOf(output, references)
            const scale =
              axis === 'angle'
                ? scalar(child(output, 'f', 'angleScale'), references)
                : scalar(
                    child(
                      resolve(child(output, 'GVector2', 'translationScale'), references),
                      'f',
                      axis,
                    ),
                    references,
                  )
            return {
              axis,
              parameterId: parameter(output, 'destination'),
              pendulumIndex: (scalar(child(output, 'i', 'vertexIndex'), references) ?? 0) - 1,
              reflect: resolve(child(output, 'b', 'isReverse'), references)?.textContent === 'true',
              scale: scale ?? 1,
              weight: (scalar(child(output, 'f', 'weight'), references) ?? percentage) / percentage,
            }
          }),
          pendulums: entries(element, 'vertices')
            .slice(1)
            .map((vertex) => ({
              acceleration: scalar(child(vertex, 'f', 'acceleration'), references) ?? 1,
              length: scalar(child(vertex, 'f', 'radius'), references) ?? 0,
              mobility: scalar(child(vertex, 'f', 'mobility'), references) ?? 1,
              reaction: scalar(child(vertex, 'f', 'delay'), references) ?? 1,
            })),
        },
      ]
    },
  )
  return chains.length === 0
    ? undefined
    : {
        chains,
        pendulums: [],
        ...(source === undefined
          ? {}
          : {
              fps: scalar(child(source, 'i', 'settingFPS'), references) ?? DEFAULT_PUPPET_CHAIN_FPS,
            }),
      }
}
