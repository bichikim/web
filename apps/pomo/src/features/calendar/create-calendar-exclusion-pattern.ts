const EXCLUSION_SUFFIX = '(?:말고|빼고|제외(?:하고)?|아니|아닌|안\\s*(?:되|돼))'

/** Matches an excluded date expression before an optional competing expression. */
export const createCalendarExclusionPattern = (phrase: string, boundary?: string): RegExp =>
  new RegExp(
    `${phrase}${boundary === undefined ? '' : `(?:(?!${boundary}).)*`}${EXCLUSION_SUFFIX}`,
    'u',
  )
