import {clamp} from 'es-toolkit/math'

import {
  getPartRenderProperties,
  mapBindingKeyforms,
  type PuppetParameterValues,
  type ResolvedPartRenderProperties,
} from '../../deformation'
import {
  canUsePartAsMask,
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_MAXIMUM_DRAW_ORDER,
  type PuppetColor,
  type PuppetDocument,
  type PuppetParameterBinding,
  type PuppetParameterPartKeyform,
  type PuppetPartRenderProperties,
} from '../../player'
import {getDocumentParameterBindings, getParameterBinding} from './parameter-keyforms'

export interface SetPartRenderPropertiesOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly properties: PuppetPartRenderProperties
}

export interface SetParameterKeyformPartPropertiesOptions {
  readonly bindingId: string
  /** The part's properties now, with its composed draw order. */
  readonly currentProperties?: ResolvedPartRenderProperties & {readonly drawOrder?: number}
  readonly document: PuppetDocument
  readonly partId: string
  readonly properties: Pick<
    PuppetPartRenderProperties,
    'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
  >
  readonly values: PuppetParameterValues
}

const adjustColor = (
  current: PuppetColor,
  desired: PuppetColor,
  keyform: PuppetColor,
): PuppetColor => [
  clamp(keyform[0] + desired[0] - current[0], 0, 1),
  clamp(keyform[1] + desired[1] - current[1], 0, 1),
  clamp(keyform[2] + desired[2] - current[2], 0, 1),
]

const getKeyformPropertyUpdate = (
  options: SetParameterKeyformPartPropertiesOptions,
  keyformPart: PuppetParameterPartKeyform,
) => {
  const current = options.currentProperties
  if (current === undefined) {
    return options.properties
  }

  const part = options.document.parts.find((candidate) => candidate.id === options.partId)!
  const rest = getPartRenderProperties(part)
  const restDrawOrder = part.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  const keyform = {
    drawOrder: keyformPart.properties?.drawOrder ?? restDrawOrder,
    multiplyColor: keyformPart.properties?.multiplyColor ?? rest.multiplyColor,
    opacity: keyformPart.properties?.opacity ?? rest.opacity,
    screenColor: keyformPart.properties?.screenColor ?? rest.screenColor,
  }
  const {drawOrder, multiplyColor, opacity, screenColor} = options.properties
  return {
    ...(drawOrder === undefined
      ? {}
      : {
          drawOrder: clamp(
            keyform.drawOrder + drawOrder - (current.drawOrder ?? restDrawOrder),
            0,
            PUPPET_MAXIMUM_DRAW_ORDER,
          ),
        }),
    ...(multiplyColor === undefined
      ? {}
      : {
          multiplyColor: adjustColor(current.multiplyColor, multiplyColor, keyform.multiplyColor),
        }),
    ...(opacity === undefined
      ? {}
      : {opacity: clamp(keyform.opacity + opacity - current.opacity, 0, 1)}),
    ...(screenColor === undefined
      ? {}
      : {
          screenColor: adjustColor(current.screenColor, screenColor, keyform.screenColor),
        }),
  }
}

export const setPartRenderProperties = (options: SetPartRenderPropertiesOptions) => {
  if (!options.document.parts.some((part) => part.id === options.partId)) {
    return undefined
  }

  const document = {
    ...options.document,
    parts: options.document.parts.map((part) =>
      part.id === options.partId
        ? {...part, properties: {...part.properties, ...options.properties}}
        : part,
    ),
  }

  const part = document.parts.find((candidate) => candidate.id === options.partId)!
  const validMasks = (part.properties?.clippingMaskIds ?? []).every((maskPartId) =>
    canUsePartAsMask({maskPartId, partId: part.id, parts: document.parts}),
  )

  return validMasks ? document : undefined
}

const replaceKeyformPart = (
  parts: ReadonlyArray<PuppetParameterPartKeyform>,
  partId: string,
  properties: SetParameterKeyformPartPropertiesOptions['properties'],
) =>
  parts.map((part) =>
    part.partId === partId ? {...part, properties: {...part.properties, ...properties}} : part,
  )

export const setParameterKeyformPartProperties = (
  options: SetParameterKeyformPartPropertiesOptions,
) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find(
    (candidate) =>
      candidate.values.length === options.values.length &&
      candidate.values.every((value, index) => value === options.values[index]),
  )
  const keyformPart = keyform?.parts.find((part) => part.partId === options.partId)
  if (binding === undefined || keyform === undefined || keyformPart === undefined) {
    return undefined
  }
  const properties = getKeyformPropertyUpdate(options, keyformPart)

  const update = (candidate: PuppetParameterBinding): PuppetParameterBinding => {
    const replaceKeyform = <Keyform extends typeof keyform>(value: Keyform): Keyform =>
      value === keyform
        ? {...value, parts: replaceKeyformPart(value.parts, options.partId, properties)}
        : value
    return mapBindingKeyforms(candidate, replaceKeyform)
  }

  return {
    ...options.document,
    parameterBindings: getDocumentParameterBindings(options.document).map((candidate) =>
      candidate.id === binding.id ? update(candidate) : candidate,
    ),
  }
}
