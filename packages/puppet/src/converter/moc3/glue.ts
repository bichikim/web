import type {PuppetGlue, PuppetParameter, PuppetParameterBinding} from '../../player/document'
import type {Moc3Model} from '../read-moc3'
import {createCubismBindings} from '../create-cubism-bindings'
import type {NativeObject} from './types'
import {numberAt} from './tables'
import {defaultCoordinates, readForms} from './keyforms'
import {baseNode} from './scene-node'
import {MOC3_SAMPLING} from './sampling'
import {readBlendBindings} from './blend-bindings'

export const readGlue = (model: Moc3Model, parameters: ReadonlyArray<PuppetParameter>) => {
  const bindings: PuppetParameterBinding[] = []
  const glue = model.tables.glue!.ids.flatMap((id, index) => {
    const begin = numberAt(model, 'glue', 'infoBegin', index)
    const count = numberAt(model, 'glue', 'infoCount', index)
    if (count % 2 !== 0) {
      throw new Error('MOC3 glue has incomplete vertex pairs')
    }
    const connections = Array.from({length: count / 2}, (_, pair): PuppetGlue => {
      const first = begin + pair * 2
      const firstWeight = numberAt(model, 'glueInfo', 'weight', first)
      const secondWeight = numberAt(model, 'glueInfo', 'weight', first + 1)
      const partId = (field: string) => {
        const identifier = model.tables.artMeshes!.ids[numberAt(model, 'glue', field, index)]
        if (identifier === undefined) {
          throw new Error('MOC3 glue references a missing mesh')
        }
        return identifier
      }
      return {
        first: {partId: partId('meshA'), vertexIndex: numberAt(model, 'glueInfo', 'vertex', first)},
        id: `${id}:${pair}`,
        second: {
          partId: partId('meshB'),
          vertexIndex: numberAt(model, 'glueInfo', 'vertex', first + 1),
        },
        strength: Math.min(1, firstWeight + secondWeight),
        weight: firstWeight + secondWeight === 0 ? 0 : firstWeight / (firstWeight + secondWeight),
      }
    })
    const forms = readForms(model, {index, table: 'glue'}, parameters, (form) => ({
      glue: connections.map((connection) => ({
        id: connection.id,
        strength: numberAt(model, 'glueKeyforms', 'intensity', form) * connection.strength,
        weight: connection.weight,
      })),
      parts: [],
    }))
    const object: NativeObject = {...forms, id, node: {...baseNode(id), kind: 'part'}, parent: -1}
    if (forms.axes.length > 0) {
      bindings.push(
        ...createCubismBindings({
          id: `moc3:glue:${id}`,
          interpolation: 'grid',
          keyforms: forms.forms,
          parameterIds: forms.axes.map((axis) => axis.id),
          sampling: MOC3_SAMPLING,
          targetGlueIds: connections.map((connection) => connection.id),
        }),
      )
    }
    const strengths = defaultCoordinates(object, (form) =>
      form.glue!.map((connection) => connection.strength),
    )
    const rest = connections.map((connection, pair) => ({
      ...connection,
      strength: strengths[pair]!,
    }))
    bindings.push(
      ...readBlendBindings(
        model,
        {
          id: `moc3:blend:glue:${id}`,
          index,
          table: 'blendGlue',
          targetGlueIds: connections.map((connection) => connection.id),
        },
        parameters,
        (form) => ({
          glue: rest.map((connection, pair) => ({
            id: connection.id,
            strength:
              connection.strength +
              numberAt(model, 'glueKeyforms', 'intensity', form) * connections[pair]!.strength,
            weight: connection.weight,
          })),
          parts: [],
        }),
      ),
    )
    return rest
  })
  return {glue, parameterBindings: bindings}
}
