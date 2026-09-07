import {createSignal, untrack} from 'solid-js'
import type {
  PuppetInfluencePoint,
  PuppetParameter,
  PuppetParameterInfluence,
} from '../../player/document'
import {hasValidInfluences, isParameterInfluences} from '../../player/internal/parse-influence'

export type InfluencePreset = 'decrease' | 'increase' | 'peak'

const MIDPOINT_DIVISOR = 2

interface UseInfluenceDraftProps {
  readonly onChange?: (influences: ReadonlyArray<PuppetParameterInfluence>) => boolean
  readonly influences?: ReadonlyArray<PuppetParameterInfluence>
  readonly parameters: ReadonlyArray<PuppetParameter>
}

const createRelation = (parameter: PuppetParameter): PuppetParameterInfluence => ({
  parameterId: parameter.id,
  points: [
    {value: parameter.minimum, weight: 1},
    {value: parameter.maximum, weight: 0},
  ],
})

export const useInfluenceDraft = (props: UseInfluenceDraftProps) => {
  const [relations, setRelations] = createSignal<ReadonlyArray<PuppetParameterInfluence>>([])
  const updateRelations = (
    update: (
      current: ReadonlyArray<PuppetParameterInfluence>,
    ) => ReadonlyArray<PuppetParameterInfluence>,
  ) => {
    const next = update(relations())
    setRelations(next)
    if (isParameterInfluences(next) && hasValidInfluences(next, props.parameters)) {
      untrack(() => props.onChange?.(next))
    }
  }
  const parameter = (index: number) =>
    props.parameters.find((item) => item.id === relations()[index]?.parameterId)
  const sources = (index: number) =>
    props.parameters.filter(
      (item) =>
        !relations().some((relation, other) => other !== index && relation.parameterId === item.id),
    )
  const availableSources = () => sources(-1)
  const replaceRelation = (index: number, relation: PuppetParameterInfluence) =>
    updateRelations((current) => current.map((item, other) => (other === index ? relation : item)))
  const insertion = (index: number) => {
    const relation = relations()[index]
    const source = parameter(index)
    if (relation === undefined || source === undefined) {
      return undefined
    }
    const {points} = relation
    if (points.length === 1) {
      const point = points[0]!
      const value = point.value === source.minimum ? source.maximum : source.minimum
      return {value, weight: point.weight}
    }
    const gaps = points.slice(1).map((point, offset) => ({left: points[offset]!, right: point}))
    const gap = gaps.sort(
      (left, right) => right.right.value - right.left.value - (left.right.value - left.left.value),
    )[0]!
    const value = gap.left.value + (gap.right.value - gap.left.value) / MIDPOINT_DIVISOR
    return value > gap.left.value && value < gap.right.value
      ? {value, weight: (gap.left.weight + gap.right.weight) / MIDPOINT_DIVISOR}
      : undefined
  }
  return {
    availableSources,
    error: () =>
      isParameterInfluences(relations()) && hasValidInfluences(relations(), props.parameters)
        ? null
        : '입력값은 parameter 범위 안에서 작은 값부터 중복 없이 입력하세요.',
    addRelation: () => {
      const [source] = availableSources()
      if (source !== undefined) {
        updateRelations((current) => [...current, createRelation(source)])
      }
    },
    preset: (index: number, preset: InfluencePreset, maximum: number) => {
      const source = parameter(index)
      if (source !== undefined) {
        replaceRelation(index, {
          parameterId: source.id,
          points:
            preset === 'peak'
              ? [
                  {value: source.minimum, weight: 0},
                  {
                    value: source.minimum + (source.maximum - source.minimum) / MIDPOINT_DIVISOR,
                    weight: maximum,
                  },
                  {value: source.maximum, weight: 0},
                ]
              : [
                  {value: source.minimum, weight: preset === 'increase' ? 0 : maximum},
                  {value: source.maximum, weight: preset === 'increase' ? maximum : 0},
                ],
        })
      }
    },
    changeSource: (index: number, id: string) => {
      const source = sources(index).find((item) => item.id === id)
      if (source !== undefined) {
        replaceRelation(index, createRelation(source))
      }
    },
    changePoint: (index: number, pointIndex: number, patch: Partial<PuppetInfluencePoint>) => {
      const relation = relations()[index]
      if (relation !== undefined) {
        replaceRelation(index, {
          ...relation,
          points: relation.points.map((point, other) =>
            other === pointIndex ? {...point, ...patch} : point,
          ),
        })
      }
    },
    parameter,
    canAddPoint: (index: number) => insertion(index) !== undefined,
    relations,
    addPoint: (index: number) => {
      const point = insertion(index)
      const relation = relations()[index]
      if (point !== undefined && relation !== undefined) {
        replaceRelation(index, {
          ...relation,
          points: [...relation.points, point].sort((left, right) => left.value - right.value),
        })
      }
    },
    sources,
    removePoint: (index: number, pointIndex: number) => {
      const relation = relations()[index]
      if (relation !== undefined && relation.points.length > 1) {
        replaceRelation(index, {
          ...relation,
          points: relation.points.filter((_, other) => other !== pointIndex),
        })
      }
    },
    removeRelation: (index: number) =>
      updateRelations((current) => current.filter((_, other) => other !== index)),
    reset: () => setRelations(props.influences ?? []),
  }
}
