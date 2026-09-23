import {createUnexpectedErrorBecomesSuccessLikeResultRule} from './unexpected-error-becomes-success-like-result'
import type {
  BuiltinRuleEntry,
  BuiltinRuleId,
  NaturalLintRule,
  UnexpectedErrorBecomesSuccessLikeResultOverride,
} from '../types'

export const BUILTIN_RULE_PREFIX = '@natural-lint/'
export const UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT =
  '@natural-lint/unexpected-error-becomes-success-like-result' as const

const OVERRIDE_KEYS = new Set(['cacheKey', 'expected', 'message', 'options', 'select', 'severity'])

const parseEntry = (
  entry: BuiltinRuleEntry,
): readonly [BuiltinRuleId | string, UnexpectedErrorBecomesSuccessLikeResultOverride] => {
  if (typeof entry === 'string') {
    return [entry, {}]
  }
  if (!Array.isArray(entry) || entry.length !== 2) {
    throw new TypeError('Built-in natural lint rule entries must be an id or [id, override].')
  }
  const [identifier, override] = entry
  if (typeof identifier !== 'string' || typeof override !== 'object' || override === null) {
    throw new TypeError('Built-in natural lint rule entries must be an id or [id, override].')
  }
  const unexpectedKey = Object.keys(override).find((key) => !OVERRIDE_KEYS.has(key))
  if (unexpectedKey !== undefined) {
    throw new TypeError(`Built-in natural lint rule override does not support ${unexpectedKey}.`)
  }
  return [identifier, override]
}

export const resolveBuiltinRule = (entry: BuiltinRuleEntry): NaturalLintRule => {
  const [identifier, override] = parseEntry(entry)
  switch (identifier) {
    case UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT: {
      return createUnexpectedErrorBecomesSuccessLikeResultRule(override)
    }
    default: {
      throw new TypeError(`Unknown built-in natural lint rule: ${identifier}.`)
    }
  }
}

export {createUnexpectedErrorBecomesSuccessLikeResultRule}
