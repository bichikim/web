/* eslint-disable no-magic-numbers -- Fixed Cubism binary flag fields. */
/* eslint-disable no-bitwise -- Cubism drawable flags. */
import type {PuppetParameter, PuppetPart} from '../../player/document'
import {validateMesh} from '../../mesh/validate'
import type {Moc3Model} from '../read-moc3'
import type {ConvertMoc3Options} from '../convert-moc3'
import type {NativeObject} from './types'
import {column, numberAt, range, readColors, readPosition} from './tables'
import {defaultCoordinates, readForms} from './keyforms'
import {baseNode} from './scene-node'
import {readBlendMode} from './blend-mode'

export const readMeshes = (
  model: Moc3Model,
  parameters: ReadonlyArray<PuppetParameter>,
  textures: ConvertMoc3Options['textures'],
) => {
  const objects: NativeObject[] = []
  const parts = model.tables.artMeshes!.ids.map((id, index): PuppetPart => {
    const texture = textures[numberAt(model, 'artMeshes', 'texture', index)]
    if (texture === undefined) {
      throw new Error(`MOC3 texture is missing for ${id}`)
    }
    const vertices = numberAt(model, 'artMeshes', 'vertices', index)
    const flags = numberAt(model, 'artMeshes', 'flags', index)
    const keyforms = readForms(model, {index, table: 'artMeshes'}, parameters, (form) => ({
      parts: [
        {
          partId: id,
          properties: {
            ...readColors(model, {index, table: 'artMeshes'}, {index: form, table: 'meshKeyforms'}),
            drawOrder: numberAt(model, 'meshKeyforms', 'order', form),
            opacity: Math.min(1, Math.max(0, numberAt(model, 'meshKeyforms', 'opacity', form))),
          },
          vertices: readPosition(model, 'meshKeyforms', form, vertices),
        },
      ],
    }))
    const object: NativeObject = {
      ...keyforms,
      deformer: numberAt(model, 'artMeshes', 'parentDeformer', index),
      id,
      node: {
        ...baseNode(
          id,
          numberAt(model, 'artMeshes', 'visible', index) !== 0 &&
            numberAt(model, 'artMeshes', 'enabled', index) !== 0,
        ),
        kind: 'part',
      },
      parent: numberAt(model, 'artMeshes', 'parentPart', index),
    }
    objects.push(object)
    const properties = defaultCoordinates(object, (form) => {
      const value = form.parts[0]!.properties!
      return [value.opacity!, value.drawOrder!, ...value.multiplyColor!, ...value.screenColor!]
    })
    const maskIndices = range(
      column(model, 'masks', 'values'),
      numberAt(model, 'artMeshes', 'maskBegin', index),
      numberAt(model, 'artMeshes', 'maskCount', index),
    )
    const masks = maskIndices.map((mask) => {
      const identifier = model.tables.artMeshes!.ids[mask]
      if (identifier === undefined) {
        throw new Error(`MOC3 ${id} refers to a missing mask`)
      }
      return identifier
    })
    const blendMode = flags & 3
    if (blendMode === 3) {
      throw new Error(`Unsupported MOC3 drawable blend mode: ${flags}`)
    }
    return {
      id,
      mesh: {
        indices: range(
          column(model, 'indices', 'values'),
          numberAt(model, 'artMeshes', 'indexBegin', index),
          numberAt(model, 'artMeshes', 'indexCount', index),
        ).map((value, coordinate, indices) =>
          model.canvas.reverseY
            ? indices[Math.floor(coordinate / 3) * 3 + 2 - (coordinate % 3)]!
            : value,
        ),
        uvs: range(
          column(model, 'uvs', 'values'),
          numberAt(model, 'artMeshes', 'uvBegin', index),
          vertices * 2,
        ).map((value, coordinate) =>
          model.canvas.reverseY && coordinate % 2 === 1 ? 1 - value : value,
        ),
        vertices: defaultCoordinates(object, (form) => form.parts[0]!.vertices),
      },
      properties: {
        ...readBlendMode(column(model, 'artMeshes', 'blend')[index] ?? blendMode),
        culling: (flags & 4) === 0,
        drawOrder: properties[1],
        multiplyColor: [properties[2]!, properties[3]!, properties[4]!],
        opacity: properties[0],
        screenColor: [properties[5]!, properties[6]!, properties[7]!],
        ...(masks.length === 0
          ? {}
          : {clippingMaskIds: [...new Set(masks)], invertedMask: (flags & 8) !== 0}),
        renderWhenUsedAsMask: true,
      },
      texture,
    }
  })
  return {
    objects,
    parts: parts.map((part) =>
      part.mesh.indices.length > 0 && validateMesh(part.mesh).valid
        ? part
        : {...part, mesh: {...part.mesh, validationSpace: 'indices' as const}},
    ),
  }
}
