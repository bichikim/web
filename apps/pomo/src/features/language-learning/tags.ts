import {filter, map, pipe, take, uniqBy} from 'es-toolkit/fp'

export const MAXIMUM_LANGUAGE_LEARNING_TAGS = 10
export const MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH = 30
export const LANGUAGE_LEARNING_TAG_DELIMITER_PATTERN = /[,;\uFF0C\uFF1B\n]/u

const tagGraphemeSegmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'})

const truncateLanguageLearningTag = (tag: string): string => {
  const tagGraphemes: string[] = []

  for (const {segment} of tagGraphemeSegmenter.segment(tag)) {
    tagGraphemes.push(segment)

    if (tagGraphemes.length === MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH) {
      return tagGraphemes.join('')
    }
  }

  return tagGraphemes.join('')
}

export const parseLanguageLearningTags = (input: string): ReadonlyArray<string> =>
  pipe(
    input.split(LANGUAGE_LEARNING_TAG_DELIMITER_PATTERN),
    map((value) => truncateLanguageLearningTag(value.trim())),
    filter((tag) => tag.length > 0),
    uniqBy((tag) => tag.toLocaleLowerCase()),
    take(MAXIMUM_LANGUAGE_LEARNING_TAGS),
  )
