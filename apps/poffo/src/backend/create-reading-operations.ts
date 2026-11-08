import {z} from 'zod'
import {defineOperation} from './define-operation'
import type {CommandContext} from './create-command-context'

export const createReadingOperations = ({model}: CommandContext) => {
  const empty = z.object({})
  return [
    defineOperation(
      'status',
      'Read session identity, revision, history and active transaction.',
      empty,
      () => {
        const {document, ...view} = model.read()
        return {...view, motionCount: document.motions.length, partCount: document.parts.length}
      },
    ),
    defineOperation(
      'document.read',
      'Read the current validated document and history view.',
      empty,
      () => model.read(),
    ),
    defineOperation(
      'document.inspect',
      'List model structure and parameter bindings without embedded texture bytes.',
      empty,
      () => {
        const {document} = model.read()
        return {
          expressions: document.expressions,
          motions: document.motions.map(({id, name}) => ({id, name})),
          parameterBindings: document.parameterBindings,
          parameters: document.parameters,
          parts: document.parts.map(({id, texture, mesh, properties, psdSource}) => ({
            id,
            properties,
            psdSource,
            texture: {height: texture.height, width: texture.width},
            vertexCount: mesh.vertices.length / 2,
          })),
          physics: document.physics,
          scene: document.scene,
          viewport: document.viewport,
        }
      },
    ),
  ]
}
