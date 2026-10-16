import {
  DEFAULT_PUPPET_EXPRESSION_FADE_TIME,
  type PuppetExpression,
  type PuppetParameter,
} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import {easeProgress} from '../internal/motion'

/** One expression with its eased fade weight, oldest first. */
export interface ExpressionLayer {
  readonly expression: PuppetExpression
  readonly weight: number
}

interface ExpressionEntry {
  readonly expression: PuppetExpression
  readonly fading: 'in' | 'out'
  /** Linear fade progress from zero to one. */
  readonly progress: number
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
  entry.fading === 'in'
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
      entries = entries
        .map((entry) => advanceEntry(entry, deltaTime))
        .filter((entry) => entry.fading === 'in' || entry.progress > 0)
    },
    current: () => entries.find((entry) => entry.fading === 'in')?.expression.id,
    isAnimating: () =>
      entries.some((entry) => (entry.fading === 'in' ? entry.progress < 1 : entry.progress > 0)),
    layers: () =>
      entries.map((entry) => ({
        expression: entry.expression,
        weight: easeProgress('ease-in-out', entry.progress),
      })),
    set(expressionId) {
      const expression = expressions.find((candidate) => candidate.id === expressionId)
      if (expressionId !== undefined && expression === undefined) {
        return false
      }
      const active = entries.find((entry) => entry.fading === 'in')
      if (active !== undefined && active.expression.id === expressionId) {
        return true
      }
      const released = entries.map((entry): ExpressionEntry => ({...entry, fading: 'out'}))
      entries =
        expression === undefined ? released : [...released, {expression, fading: 'in', progress: 0}]
      return true
    },
    update(nextExpressions) {
      expressions = nextExpressions
      const byId = new Map(expressions.map((expression) => [expression.id, expression]))
      entries = entries.flatMap((entry) => {
        const expression = byId.get(entry.expression.id)
        return expression === undefined ? [] : [{...entry, expression}]
      })
    },
  }
}

/** Applies expression layers to motion-mixed values (`add`, `multiply`, `overwrite`). */
export const applyExpressionLayers = (
  parameters: ReadonlyArray<PuppetParameter>,
  values: PuppetParameterValueMap,
  layers: ReadonlyArray<ExpressionLayer>,
): PuppetParameterValueMap =>
  layers.length === 0
    ? values
    : Object.fromEntries(
        parameters.map((parameter) => [
          parameter.id,
          layers.reduce((value, layer) => {
            const entry = layer.expression.parameters.find(
              (candidate) => candidate.parameterId === parameter.id,
            )
            if (entry === undefined) {
              return value
            }
            switch (entry.blend) {
              case 'add':
                return value + entry.value * layer.weight
              case 'multiply':
                return value * (1 + (entry.value - 1) * layer.weight)
              case 'overwrite':
                return value + (entry.value - value) * layer.weight
              default: {
                const exhaustive: never = entry.blend
                return exhaustive
              }
            }
          }, values[parameter.id] ?? parameter.defaultValue),
        ]),
      )
