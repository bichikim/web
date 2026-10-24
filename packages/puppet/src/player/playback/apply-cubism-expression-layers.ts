import type {PuppetParameter} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import type {ExpressionLayer} from './expression-playback'

/** Cubism의 채널별 전환값을 합성한 뒤 누적 페이드인 가중치로 원래 값에 적용한다. */
export const applyCubismExpressionLayers = (
  parameters: ReadonlyArray<PuppetParameter>,
  values: PuppetParameterValueMap,
  layers: ReadonlyArray<ExpressionLayer>,
): PuppetParameterValueMap => {
  const weight = Math.min(
    1,
    layers.reduce((sum, layer) => sum + (layer.fadeInWeight ?? layer.weight), 0),
  )
  return Object.fromEntries(
    parameters.map((parameter) => {
      const base = values[parameter.id] ?? parameter.defaultValue
      const result = layers.reduce(
        (current, layer, index) => {
          const entry = layer.expression.parameters.find(
            (candidate) => candidate.parameterId === parameter.id,
          )
          const additive = entry?.blend === 'add' ? entry.value : 0
          const multiply = entry?.blend === 'multiply' ? entry.value : 1
          const overwrite = entry?.blend === 'overwrite' ? entry.value : base
          if (index === 0) {
            return {additive, multiply, overwrite}
          }
          return {
            additive: current.additive * (1 - layer.weight) + additive * layer.weight,
            multiply: current.multiply * (1 - layer.weight) + multiply * layer.weight,
            overwrite: base * (1 - layer.weight) + overwrite * layer.weight,
          }
        },
        {additive: 0, multiply: 1, overwrite: base},
      )
      return [
        parameter.id,
        base * (1 - weight) + (result.overwrite + result.additive) * result.multiply * weight,
      ]
    }),
  )
}
