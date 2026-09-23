const MAX_PASSAGE = 800
export interface EvidencePassage {
  readonly id: string
  readonly text: string
}
export interface CreateEvidencePassagesOptions {
  readonly side: 'left' | 'right'
  readonly text: string
}
/** Partitions source text verbatim into at most 800 UTF-16-unit passages without splitting code points. */
export const createEvidencePassages = (
  options: CreateEvidencePassagesOptions,
): ReadonlyArray<EvidencePassage> => {
  const passages: EvidencePassage[] = []
  let text = ''
  for (const character of options.text) {
    if (text.length + character.length > MAX_PASSAGE) {
      passages.push({id: `${options.side}-${passages.length + 1}`, text})
      text = ''
    }
    text += character
  }
  if (text.length > 0) {
    passages.push({id: `${options.side}-${passages.length + 1}`, text})
  }
  return passages
}
