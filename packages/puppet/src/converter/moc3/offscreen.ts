/* eslint-disable no-magic-numbers -- Fixed Cubism binary flag fields. */
/* eslint-disable no-bitwise -- Cubism drawable flags. */
import type {PuppetGroupRenderProperties} from '../../player/document'
import type {Moc3Model} from '../read-moc3'
import {column, numberAt, range, readColors} from './tables'
import {readBlendMode} from './blend-mode'

/** Reads the isolated surface owned by a Cubism part, when present. */
export const readOffscreen = (model: Moc3Model, part: number): PuppetGroupRenderProperties => {
  const source = column(model, 'parts', 'offscreen')[part] ?? -1
  if (source < 0) {
    return {}
  }
  const masks = range(
    column(model, 'masks', 'values'),
    numberAt(model, 'offscreens', 'maskBegin', source),
    numberAt(model, 'offscreens', 'maskCount', source),
  ).map((mask) => {
    const id = model.tables.artMeshes!.ids[mask]
    if (id === undefined) {
      throw new Error('MOC3 offscreen references a missing mask')
    }
    return id
  })
  return {
    ...readBlendMode(numberAt(model, 'offscreens', 'blend', source)),
    offscreen: true,
    ...(masks.length === 0
      ? {}
      : {
          clippingMaskIds: [...new Set(masks)],
          invertedMask: (numberAt(model, 'offscreens', 'flags', source) & 8) !== 0,
        }),
  }
}

/** Reads the opacity and color keyform of a part's isolated surface. */
export const readOffscreenKeyform = (
  model: Moc3Model,
  form: number,
): PuppetGroupRenderProperties => {
  const index = column(model, 'partKeyforms', 'offscreenBegin')[form] ?? -1
  if (index < 0) {
    return {multiplyColor: [1, 1, 1], opacity: 1, screenColor: [0, 0, 0]}
  }
  return {
    ...readColors(model, {index: 0, table: 'parts'}, {index, table: 'offscreenKeyforms'}),
    opacity: numberAt(model, 'offscreenKeyforms', 'opacity', index),
  }
}
