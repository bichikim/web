import {createCalendarExclusionPattern} from './create-calendar-exclusion-pattern'
import type {CalendarWeekendIntent} from './period-range'

/** Keeps weekend selection local to its qualified or bare expression. */
export const createWeekendSelection = (
  wordStartPattern: string,
  periodBoundaryPattern: RegExp,
): ((text: string) => CalendarWeekendIntent | null) => {
  const nextPattern = /다음 ?주말/u
  const previousPattern = /(?:지난|저번) ?주말/u
  const afterNextPattern = new RegExp(
    `${wordStartPattern}다다음 ?주말${periodBoundaryPattern.source}`,
    'u',
  )
  const afterNextExclusion = createCalendarExclusionPattern(
    `${afterNextPattern.source}(?:은|에)?\\s*`,
  )
  const weekendExclusion = createCalendarExclusionPattern('주말(?:은|에)?\\s*')
  const weekendPattern = /주말/u
  const qualifiedTerm = '(?:다다음|다음|지난|저번) ?주말'
  const qualifiedExclusion = createCalendarExclusionPattern(`${qualifiedTerm}(?:은|에)?\\s*`)
  const excludedTarget = createCalendarExclusionPattern(
    `${wordStartPattern}(?:다다음|지난|저번) ?주말(?:은|에)?\\s*`,
  )
  const qualifiedExpression = new RegExp(`${qualifiedExclusion.source}|${qualifiedTerm}`, 'gu')

  const hasUnexcludedBareWeekend = (text: string): boolean => {
    if (!excludedTarget.test(text)) {
      return false
    }

    const expressions = [...text.matchAll(qualifiedExpression)]
    if (expressions.some(([expression]) => !qualifiedExclusion.test(expression))) {
      return false
    }

    const bareText = text.replace(qualifiedExpression, '')
    return weekendPattern.test(bareText) && !weekendExclusion.test(bareText)
  }

  return (text) => {
    if (afterNextPattern.test(text) && !afterNextExclusion.test(text)) {
      return 'after-next'
    }

    if (!weekendPattern.test(text)) {
      return null
    }

    if (weekendExclusion.test(text)) {
      return hasUnexcludedBareWeekend(text) ? 'upcoming' : null
    }

    if (previousPattern.test(text)) {
      return 'previous'
    }

    return nextPattern.test(text) ? 'next' : 'upcoming'
  }
}
