export type DayPillarTerm = '일주' | '일간'

/** Returns mentioned day names, excluding known duration and place compounds. */
export function getDayPillarTerms(question: string): ReadonlyArray<DayPillarTerm> {
  const matches: ReadonlyArray<string> =
    question.match(/일주(?:간|일(?!까|\s+경우)|변)?|일간/gu) ?? []
  return (['일주', '일간'] as const).filter((term) => matches.includes(term))
}
