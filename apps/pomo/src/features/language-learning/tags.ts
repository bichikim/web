export const MAXIMUM_LANGUAGE_LEARNING_TAGS = 10
export const MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH = 30

export const parseLanguageLearningTags = (input: string): ReadonlyArray<string> => {
  const tags: Array<string> = []
  const normalizedTags = new Set<string>()

  for (const value of input.split(/[,\n]/u)) {
    const tag = value.trim().slice(0, MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH)
    const normalized = tag.toLocaleLowerCase()

    if (tag.length > 0 && !normalizedTags.has(normalized)) {
      tags.push(tag)
      normalizedTags.add(normalized)
    }

    if (tags.length === MAXIMUM_LANGUAGE_LEARNING_TAGS) {
      return tags
    }
  }

  return tags
}
