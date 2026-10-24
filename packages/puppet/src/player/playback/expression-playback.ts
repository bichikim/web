import {
  DEFAULT_PUPPET_EXPRESSION_FADE_TIME,
  type PuppetExpression,
  type PuppetParameter,
} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {easeProgress} from '../internal/motion'
import {blendParameterValue} from '../parameter-blends'
import {easeSine} from './motion-fade'
import {applyCubismExpressionLayers} from './apply-cubism-expression-layers'

/** One expression with its eased fade weight, oldest first. */
export interface ExpressionLayer {
  readonly expression: PuppetExpression
  readonly weight: number
  /** Cubism 합성의 전체 적용량. 생략하면 레이어의 가중치를 사용한다. */
  readonly fadeInWeight?: number
}

interface ExpressionEntry {
  readonly expression: PuppetExpression
  readonly fading: 'in' | 'out' | 'replaced'
  /** Linear fade progress from zero to one. */
  readonly progress: number
  readonly release?: number
}

export interface ExpressionPlayback {
  advance(deltaTime: number): void
  /** The expression fading in or held, if any. */
  current(): string | undefined
  isAnimating(): boolean
  layers(): ReadonlyArray<ExpressionLayer>
  /** Cross-fades to `expressionId`; `undefined` fades every expression out. */
  set(expressionId: string | undefined): boolean
  update(expressions: ReadonlyArray<PuppetExpression>): void
}

const fadeStep = (seconds: number | undefined, deltaTime: number) => {
  const duration = seconds ?? DEFAULT_PUPPET_EXPRESSION_FADE_TIME
  return duration > 0 ? deltaTime / duration : Number.POSITIVE_INFINITY
}

const advanceEntry = (entry: ExpressionEntry, deltaTime: number): ExpressionEntry =>
  entry.expression.composition === 'cubism'
    ? {
        ...entry,
        progress:
          entry.fading === 'out'
            ? entry.progress
            : Math.min(1, entry.progress + fadeStep(entry.expression.fadeInTime, deltaTime)),
        release:
          entry.fading === 'in'
            ? 1
            : Math.max(0, (entry.release ?? 1) - fadeStep(entry.expression.fadeOutTime, deltaTime)),
      }
    : entry.fading === 'in'
      ? {
          ...entry,
          progress: Math.min(1, entry.progress + fadeStep(entry.expression.fadeInTime, deltaTime)),
        }
      : {
          ...entry,
          progress: Math.max(0, entry.progress - fadeStep(entry.expression.fadeOutTime, deltaTime)),
        }

export const createExpressionPlayback = (
  initialExpressions: ReadonlyArray<PuppetExpression>,
): ExpressionPlayback => {
  let expressions = initialExpressions
  let entries: ReadonlyArray<ExpressionEntry> = []

  return {
    advance(deltaTime) {
      if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
        return
      }
      const advanced = entries.map((entry) => advanceEntry(entry, deltaTime))
      const active = advanced.find((entry) => entry.fading === 'in')
      entries = advanced.filter((entry) => {
        if (entry.expression.composition !== 'cubism') {
          return entry.fading === 'in' || entry.progress > 0
        }
        return (
          entry.fading === 'in' ||
          (entry.fading === 'replaced' && active !== undefined
            ? active.progress < 1
            : (entry.release ?? 1) > 0)
        )
      })
    },
    current: () => entries.find((entry) => entry.fading === 'in')?.expression.id,
    isAnimating: () =>
      entries.some((entry) =>
        entry.fading === 'in'
          ? entry.progress < 1
          : entry.expression.composition === 'cubism'
            ? (entry.release ?? 1) > 0
            : entry.progress > 0,
      ),
    layers: () =>
      entries.map((entry) => {
        if (entry.expression.composition === 'cubism') {
          const fadeIn = easeSine(entry.progress)
          const weight = fadeIn * (entry.fading === 'in' ? 1 : easeSine(entry.release ?? 1))
          return {
            expression: entry.expression,
            fadeInWeight:
              entry.fading !== 'out' && entries.some((candidate) => candidate.fading === 'in')
                ? fadeIn
                : weight,
            weight,
          }
        }
        return {expression: entry.expression, weight: easeProgress('ease-in-out', entry.progress)}
      }),
    set(expressionId) {
      const expression = expressions.find((candidate) => candidate.id === expressionId)
      if (expressionId !== undefined && expression === undefined) {
        return false
      }
      const active = entries.find((entry) => entry.fading === 'in')
      if (active !== undefined && active.expression.id === expressionId) {
        return true
      }
      const previous =
        expression?.composition === 'cubism' && expression.fadeInTime === 0 ? [] : entries
      const released = previous
        .filter(
          (entry) =>
            (entry.expression.composition === 'cubism' && expression !== undefined) ||
            (entry.expression.fadeOutTime ?? DEFAULT_PUPPET_EXPRESSION_FADE_TIME) > 0,
        )
        .map(
          (entry): ExpressionEntry => ({
            ...entry,
            fading:
              entry.expression.composition === 'cubism' &&
              expression !== undefined &&
              entry.fading !== 'out'
                ? 'replaced'
                : 'out',
          }),
        )
      entries =
        expression === undefined
          ? released
          : [...released, {expression, fading: 'in', progress: expression.fadeInTime === 0 ? 1 : 0}]
      return true
    },
    update(nextExpressions) {
      expressions = nextExpressions
      const byId = new Map(expressions.map((expression) => [expression.id, expression]))
      entries = entries.flatMap((entry) => {
        const expression = byId.get(entry.expression.id)
        return expression === undefined ? [] : [{...entry, expression}]
      })
      if (!entries.some((entry) => entry.fading === 'in')) {
        entries = entries.map((entry) => ({...entry, fading: 'out'}))
      }
    },
  }
}

/**
 * Applies expression layers to motion-mixed values (`add`, `multiply`, `overwrite`), by each
 * layer's weight with the same operations as parameter blends.
 */
export const applyExpressionLayers = (
  parameters: ReadonlyArray<PuppetParameter>,
  values: PuppetParameterValueMap,
  layers: ReadonlyArray<ExpressionLayer>,
): PuppetParameterValueMap =>
  layers.length === 0
    ? values
    : layers.every((layer) => layer.expression.composition === 'cubism')
      ? applyCubismExpressionLayers(parameters, values, layers)
      : Object.fromEntries(
          parameters.map((parameter) => [
            parameter.id,
            layers.reduce((value, layer) => {
              const entry = layer.expression.parameters.find(
                (candidate) => candidate.parameterId === parameter.id,
              )
              return entry === undefined
                ? value
                : blendParameterValue(value, {
                    mode: entry.blend,
                    value: entry.value,
                    weight: layer.weight,
                  })
            }, values[parameter.id] ?? parameter.defaultValue),
          ]),
        )
