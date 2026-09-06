import type {PuppetParameter, PuppetParameterInfluence} from '../../player/document'
import type {PuppetParameterValueMap} from '../../deformation'
import {createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {InfluencePreset, useInfluenceDraft} from './use-influence-draft'

const WHOLE_PERCENT = 100

export type InfluenceDirection = InfluencePreset | 'custom'

export interface InfluenceRelationProps {
  readonly draft: ReturnType<typeof useInfluenceDraft>
  readonly index: number
  readonly count: number
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
  readonly parameterValues?: PuppetParameterValueMap
}

const isPeak = (source: PuppetParameter | undefined, relation: PuppetParameterInfluence) => {
  const PEAK_POINTS = 3
  const {points} = relation
  return (
    source !== undefined &&
    points.length === PEAK_POINTS &&
    points[0]?.value === source.minimum &&
    points[0].weight === 0 &&
    points[1]?.value === source.minimum + (source.maximum - source.minimum) / 2 &&
    points[2]?.value === source.maximum &&
    points[2].weight === 0
  )
}

export const useInfluenceSettings = (props: InfluenceRelationProps) => {
  let editing = false
  const startEdit = () => {
    if (!editing) {
      editing = true
      props.onEditStart?.()
    }
  }
  const endEdit = () => {
    if (editing) {
      editing = false
      props.onEditEnd?.()
    }
  }
  onCleanup(endEdit)
  const [chosenDirection, setChosenDirection] = createSignal<InfluenceDirection | null>(null)
  const [expanded, setExpanded] = createSignal(false)
  const relation = () => props.draft.relations()[props.index]!
  const sourceId = createMemo(() => relation().parameterId)
  createEffect(on(sourceId, () => setChosenDirection(null)))
  const maximum = () => Math.max(...relation().points.map((point) => point.weight))
  const direction = (): InfluenceDirection => {
    const chosen = chosenDirection()
    if (chosen !== null && maximum() === 0) {
      return chosen
    }
    const source = props.draft.parameter(props.index)
    const {points} = relation()
    if (isPeak(source, relation())) {
      return 'peak'
    }
    if (
      points.length !== 2 ||
      points[0]?.value !== source?.minimum ||
      points[1]?.value !== source?.maximum
    ) {
      return 'custom'
    }
    if (points[1]?.weight === 0) {
      return 'decrease'
    }
    return points[0]?.weight === 0 ? 'increase' : 'custom'
  }
  const description = () => {
    switch (direction()) {
      case 'decrease':
        return '값이 커질수록 약하게'
      case 'increase':
        return '값이 커질수록 강하게'
      case 'peak':
        return '중간에서 최대'
      case 'custom':
        return '직접 설정'
    }
  }
  const changeDirection = (value: string) => {
    if (value !== 'increase' && value !== 'decrease' && value !== 'peak' && value !== 'custom') {
      return
    }
    setChosenDirection(value)
    if (value === 'custom') {
      setExpanded(true)
    } else {
      props.draft.preset(props.index, value, maximum())
    }
  }
  const changeMaximum = (value: number) => {
    const current = direction()
    setChosenDirection(current)
    if (current !== 'custom') {
      props.draft.preset(props.index, current, value / WHOLE_PERCENT)
    }
  }
  const editCurve = (operation: () => void) => {
    setChosenDirection('custom')
    operation()
  }
  return {
    endEdit,
    startEdit,
    changeDirection,
    changeMaximum,
    direction,
    description,
    relation,
    changeSource: (id: string) => {
      setChosenDirection(null)
      props.draft.changeSource(props.index, id)
    },
    maximum,
    editCurve,
    expanded,
    setExpanded,
  }
}
