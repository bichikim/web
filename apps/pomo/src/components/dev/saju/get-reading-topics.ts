const READING_TOPICS = [
  ['wealth', /재물|금전|돈|수입|소득|재산/u],
  ['career', /직업|직장|취업|이직|(?:하는|맡은|내|제)\s*일(?!주|간)|일이\s*(?:나|맞)/u],
  ['relationship', /연애|사랑|결혼|인연|애인|남자친구|여자친구/u],
  ['personality', /성향|성격|기질/u],
  ['other', /관계|건강|대운|오행|십성|행복|미래|앞날|장래|운세/u],
] as const

export type ReadingTopic = (typeof READING_TOPICS)[number][0]

/** Returns the reading topics named in a question. */
export function getReadingTopics(question: string): ReadingTopic[] {
  return READING_TOPICS.flatMap(([topic, pattern]) => (pattern.test(question) ? [topic] : []))
}
