import type {PuppetParameter} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import type {ExpressionLayer} from './expression-playback'

/** 독립 표정의 덮어쓰기 우선순위와 곱셈·덧셈 누적을 적용한다. 레이어는 활성화 순서다. */
export const applyStackedExpressionLayers = (
  parameters: ReadonlyArray<PuppetParameter>,
  values: PuppetParameterValueMap,
  layers: ReadonlyArray<ExpressionLayer>,
): PuppetParameterValueMap =>
  Object.fromEntries(
    parameters.map((parameter) => {
      const base = values[parameter.id] ?? parameter.defaultValue
      const channels = layers.reduce(
        (current, layer) => {
          const entry = layer.expression.parameters.find(
            (candidate) => candidate.parameterId === parameter.id,
          )
          if (entry === undefined) {
            return current
          }
          switch (entry.blend) {
            case 'add':
              return {...current, additive: current.additive + entry.value * layer.weight}
            case 'multiply':
              return {
                ...current,
                multiply: current.multiply * (1 + (entry.value - 1) * layer.weight),
              }
            case 'overwrite':
              return {
                ...current,
                overwrite: current.overwrite * (1 - layer.weight) + entry.value * layer.weight,
              }
            default: {
              const exhaustive: never = entry.blend
              return exhaustive
            }
          }
        },
        {additive: 0, multiply: 1, overwrite: base},
      )
      return [parameter.id, channels.overwrite * channels.multiply + channels.additive]
    }),
  )
