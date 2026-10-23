import type {Element} from '@xmldom/xmldom'
import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterInfluence,
  PuppetParameterKeyformBase,
  PuppetPart,
  PuppetSceneNode,
} from '../player/document'
import {child, elementChildren, field, guid, resolve, scalar} from './cmo3-xml'
import {createCmo3Binding} from './create-cmo3-binding'

interface Morph {
  readonly parameter: PuppetParameter
  readonly form: Element
  readonly value: number
}

export interface ReadCmo3MorphsOptions {
  /** 모프와 제약을 저장한 원본 객체. */
  readonly source: Element
  /** 기본 파라미터 값으로 평가한 네이티브 노드. */
  readonly node: PuppetSceneNode
  /** 메시 노드의 기본 형상. 다른 노드에서는 생략한다. */
  readonly part?: PuppetPart
  /** GUID로 찾는 원본 파라미터. */
  readonly parameters: ReadonlyMap<string, PuppetParameter>
  /** 공유 XML 요소. */
  readonly references: ReadonlyMap<string, Element>
  /** 원격 컨버터와 같은 규칙으로 모프의 키폼을 읽는다. */
  readonly readForm: (form: Element) => PuppetParameterKeyformBase
}

const formProperties = (properties: PuppetPart['properties']) => ({
  drawOrder: properties?.drawOrder,
  multiplyColor: properties?.multiplyColor,
  opacity: properties?.opacity,
  screenColor: properties?.screenColor,
})

const referenceForm = (options: ReadCmo3MorphsOptions): PuppetParameterKeyformBase => {
  const {node, part} = options
  switch (node.kind) {
    case 'part':
      if (part === undefined) {
        throw new Error(`CMO3 morph mesh is missing: ${node.id}`)
      }
      return {
        parts: [
          {
            partId: part.id,
            properties: formProperties(part.properties),
            vertices: part.mesh.vertices,
          },
        ],
      }
    case 'group':
      return {groups: [{groupId: node.id, properties: formProperties(node.properties)}], parts: []}
    case 'deformer':
      return {
        deformers: [
          {
            controlPoints: node.controlPoints,
            kind: 'deformer',
            nodeId: node.id,
            properties: node.properties,
            ...(node.deformerType === 'rotation'
              ? {
                  rotationAngle: node.rotationAngle,
                  rotationReflection: node.rotationReflection,
                  rotationScale: node.rotationScale,
                }
              : {}),
          },
        ],
        parts: [],
      }
    default: {
      const exhaustive: never = node
      return exhaustive
    }
  }
}

const readInfluences = (
  options: ReadCmo3MorphsOptions,
  parameterId: string,
): ReadonlyArray<PuppetParameterInfluence> => {
  const grouped = new Map<string, Array<{readonly value: number; readonly weight: number}>>()
  for (const entry of elementChildren(
    resolve(field(options.source, 'carray_list', '_constraints'), options.references),
  )) {
    const constraint = resolve(entry, options.references)!
    const target = options.parameters.get(
      guid(child(constraint, 'CParameterGuid', 'morphTargetParameterGuid'), options.references) ??
        '',
    )
    if (target?.id === parameterId) {
      const parameter = options.parameters.get(
        guid(child(constraint, 'CParameterGuid', 'constraintParameterGuid'), options.references) ??
          '',
      )
      const value = scalar(child(constraint, 'f', 'constraintParameterValue'), options.references)
      const weight = scalar(child(constraint, 'f', 'blendWeight'), options.references)
      if (
        parameter === undefined ||
        value === undefined ||
        weight === undefined ||
        weight < 0 ||
        weight > 1
      ) {
        throw new Error('CMO3 morph constraint is invalid')
      }
      const points = grouped.get(parameter.id) ?? []
      points.push({value, weight})
      grouped.set(parameter.id, points)
    }
  }
  return Array.from(grouped, ([id, points]) => ({
    parameterId: id,
    points: points.sort((first, second) => first.value - second.value),
  }))
}

/** 기준 형태와의 차이로 합성하는 CMO3 모프 및 제약 가중치를 보존한다. */
export const readCmo3Morphs = (
  options: ReadCmo3MorphsOptions,
): ReadonlyArray<PuppetParameterBinding> => {
  const forms = new Map(
    elementChildren(
      resolve(child(options.source, 'carray_list', 'keyforms'), options.references),
    ).map((entry) => {
      const form = resolve(entry, options.references)!
      return [guid(field(form, 'CFormGuid', 'guid'), options.references), form]
    }),
  )
  const morphs = elementChildren(
    resolve(field(options.source, 'carray_list', '_morphTargets'), options.references),
  ).map((entry): Morph => {
    const morph = resolve(entry, options.references)!
    const parameter = options.parameters.get(
      guid(child(morph, 'CParameterGuid', 'parameterGuid'), options.references) ?? '',
    )
    const form = forms.get(guid(child(morph, 'CFormGuid', 'keyformGuid'), options.references))
    const value = scalar(child(morph, 'f', 'keyValue'), options.references)
    if (parameter === undefined || form === undefined || value === undefined) {
      throw new Error('CMO3 morph target is invalid')
    }
    return {form, parameter, value}
  })
  if (morphs.length === 0) {
    return []
  }
  const reference = referenceForm(options)
  const grouped = new Map<string, Morph[]>()
  for (const morph of morphs) {
    const entries = grouped.get(morph.parameter.id) ?? []
    entries.push(morph)
    grouped.set(morph.parameter.id, entries)
  }
  return Array.from(grouped, ([parameterId, entries]) => {
    const keyforms = new Map([
      [entries[0]!.parameter.defaultValue, reference],
      ...entries.map((entry) => [entry.value, options.readForm(entry.form)] as const),
    ])
    return createCmo3Binding({
      id: `cmo3:morph:${options.node.id}:${parameterId}`,
      influences: readInfluences(options, parameterId),
      interpolation: 'grid',
      keyformRange: 'unbounded',
      keyforms: Array.from(keyforms, ([value, form]) => ({...form, values: [value]})).sort(
        (first, second) => first.values[0]! - second.values[0]!,
      ),
      parameterIds: [parameterId],
      targetDeformerIds: reference.deformers?.map((entry) => entry.nodeId),
      targetGroupIds: reference.groups?.map((entry) => entry.groupId),
      targetPartIds: reference.parts.map((entry) => entry.partId),
    })
  })
}
