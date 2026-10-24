import {createMemo} from 'solid-js'
import {sampleInfluence} from '../../deformation/influence'
import type {PuppetParameter, PuppetParameterInfluence} from '../../player/document'

const WHOLE_PERCENT = 100
const GRAPH_WIDTH = 200

interface InfluenceGraphProps {
  readonly parameter: PuppetParameter
  readonly relation: PuppetParameterInfluence
  readonly value?: number
}

export const InfluenceGraph = (props: InfluenceGraphProps) => {
  const input = createMemo(() => {
    return props.value === undefined || !Number.isFinite(props.value)
      ? props.parameter.defaultValue
      : Math.max(props.parameter.minimum, Math.min(props.parameter.maximum, props.value))
  })
  const weight = createMemo(() => sampleInfluence(props.relation, input()))
  const position = (value: number) =>
    ((value - props.parameter.minimum) / (props.parameter.maximum - props.parameter.minimum)) *
    GRAPH_WIDTH
  const height = (weight: number) => (1 - weight) * WHOLE_PERCENT
  const points = createMemo(() => {
    return [
      {
        value: props.parameter.minimum,
        weight: sampleInfluence(props.relation, props.parameter.minimum),
      },
      ...props.relation.points,
      {
        value: props.parameter.maximum,
        weight: sampleInfluence(props.relation, props.parameter.maximum),
      },
    ]
      .map((point) => `${position(point.value)},${height(point.weight)}`)
      .join(' ')
  })
  return (
    <figure class="influence-graph">
      <div class="influence-graph-labels">
        <span>적용량 0–100%</span>
      </div>
      <svg viewBox="-5 -5 210 110" role="img" aria-label={`${props.parameter.name} 영향도 곡선`}>
        <path
          class="influence-graph-grid"
          d="M0 0H200 M0 50H200 M0 100H200 M0 0V100 M100 0V100 M200 0V100"
        />
        <polyline points={points()} />
        <line
          class="influence-graph-guide"
          x1={position(input())}
          x2={position(input())}
          y1="0"
          y2="100"
        />
        <circle cx={position(input())} cy={height(weight())} />
      </svg>
      <div class="influence-graph-labels">
        <span>{props.parameter.minimum}</span>
        <span>입력값</span>
        <span>{props.parameter.maximum}</span>
      </div>
      <figcaption>
        현재 입력 {Number(input().toFixed(2))} → 적용량{' '}
        {Number((weight() * WHOLE_PERCENT).toFixed(1))}%
      </figcaption>
    </figure>
  )
}
