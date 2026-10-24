import type {Element} from '@xmldom/xmldom'
import type {
  PuppetGlue,
  PuppetGlueKeyform,
  PuppetParameter,
  PuppetParameterBinding,
  PuppetPart,
} from '../player/document'
import {child, field, getSources, guid, numbers, resolve, scalar} from './cmo3-xml'
import {createCmo3Binding} from './create-cmo3-binding'
import {type PuppetParameterValues, sampleParameterCoordinates} from '../deformation/parameter'
import {readCmo3Keyforms} from './read-cmo3-keyforms'

interface Cmo3Mesh {
  readonly part: PuppetPart
  readonly source: Element
}

export interface Cmo3Glue {
  readonly warnings: ReadonlyArray<string>
  readonly glue: ReadonlyArray<PuppetGlue>
  readonly parameterBindings: ReadonlyArray<PuppetParameterBinding>
}

const glueSamples = (
  connections: ReadonlyArray<PuppetGlue>,
  strength: number,
): ReadonlyArray<PuppetGlueKeyform> =>
  connections.map((connection) => ({
    id: connection.id,
    strength,
    weight: connection.weight,
  }))

/** 정점 UID 연결을 각 파츠의 정점 인덱스로 변환한다. */
export const readCmo3Glue = (
  model: Element,
  references: ReadonlyMap<string, Element>,
  meshes: ReadonlyArray<Cmo3Mesh>,
  parameters: ReadonlyMap<string, PuppetParameter>,
): Cmo3Glue => {
  const byGuid = new Map(
    meshes.map((mesh) => [guid(field(mesh.source, 'CDrawableGuid', 'guid'), references), mesh]),
  )
  const endpoint = (source: Element, name: string, uid: number) => {
    const mesh = byGuid.get(guid(child(source, 'CDrawableGuid', name), references))
    const identifiers =
      mesh === undefined
        ? []
        : numbers(resolve(field(mesh.source, 'int-array', 'pointUid'), references))
    const vertexIndex = identifiers.indexOf(uid)
    if (mesh === undefined) {
      throw new Error('CMO3 glue refers to a missing mesh vertex')
    }
    return vertexIndex < 0 ? undefined : {partId: mesh.part.id, vertexIndex}
  }
  const warnings: string[] = []
  const parameterBindings: PuppetParameterBinding[] = []
  const glue = getSources(model, 'CAffecterSourceSet', references).flatMap((source) => {
    if (source.tagName !== 'CGlueSource') {
      throw new Error(`CMO3 affecter ${source.tagName} is not supported`)
    }
    const forms = readCmo3Keyforms(source, references)
    const form = forms.forms[0]?.form
    const strength = form === undefined ? 1 : (scalar(child(form, 'f', 'intensity')) ?? 1)
    const weights = numbers(resolve(child(source, 'float-array', 'weights'), references))
    const vertices = numbers(resolve(child(source, 'long-array', 'bindVertexUids'), references))
    const id =
      resolve(field(source, 'CAffecterId', 'id'), references)?.getAttribute('idstr') ?? 'glue'
    const connections = Array.from({length: vertices.length / 2}, (_, index) => index).flatMap(
      (index): ReadonlyArray<PuppetGlue> => {
        const first = endpoint(source, 'targetArtMeshA_guid', vertices[index * 2]!)
        const second = endpoint(source, 'targetArtMeshB_guid', vertices[index * 2 + 1]!)
        if (first === undefined || second === undefined) {
          return []
        }
        const firstWeight = weights[index * 2]!
        const secondWeight = weights[index * 2 + 1]!
        return [
          {
            composition: 'sequential',
            first,
            id: `${id}:${index}`,
            second,
            strength: Math.min(1, Math.max(0, strength)),
            weight:
              firstWeight + secondWeight === 0 ? 0 : firstWeight / (firstWeight + secondWeight),
          },
        ]
      },
    )
    const omitted = vertices.length / 2 - connections.length
    if (omitted > 0) {
      warnings.push(
        `${id}: 원본 메시에 없는 정점을 참조하는 Glue 연결 ${omitted}개를 제외했습니다.`,
      )
    }
    if (forms.parameterGuids.length === 0 || connections.length === 0) {
      return connections
    }
    const axes = forms.parameterGuids.map((key) => {
      const parameter = parameters.get(key)
      if (parameter === undefined) {
        throw new Error(`CMO3 glue ${id} refers to a missing parameter`)
      }
      return parameter
    })
    const keyforms = forms.forms.map(({form, values}) => ({
      glue: glueSamples(
        connections,
        Math.min(1, Math.max(0, scalar(child(form, 'f', 'intensity')) ?? 1)),
      ),
      parts: [],
      values,
    }))
    const binding = createCmo3Binding({
      id: `cmo3:glue:${id}`,
      interpolation: 'grid',
      keyforms,
      parameterIds: axes.map((parameter) => parameter.id),
      targetGlueIds: connections.map((connection) => connection.id),
    })
    parameterBindings.push(binding)
    const defaults = axes.map((parameter) => parameter.defaultValue)
    const values: PuppetParameterValues =
      defaults.length === 1
        ? [defaults[0]!]
        : defaults.length === 2
          ? [defaults[0]!, defaults[1]!]
          : [defaults[0]!, defaults[1]!, defaults[2]!]
    const [defaultStrength] = sampleParameterCoordinates({
      binding,
      keyformCoordinates: forms.forms.map(({form}) => [scalar(child(form, 'f', 'intensity')) ?? 1]),
      restCoordinates: [strength],
      values,
    })
    return connections.map((connection) => ({
      ...connection,
      strength: Math.min(1, Math.max(0, defaultStrength!)),
    }))
  })
  return {
    glue,
    parameterBindings,
    warnings,
  }
}
