import {filter, map, pipe, take, uniqBy} from 'es-toolkit/fp'

export const MAXIMUM_LANGUAGE_LEARNING_TAGS = 10
export const MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH = 30

export const parseLanguageLearningTags = (input: string): ReadonlyArray<string> =>
  pipe(
    input.split(/[,\n]/u),
    map((value) => value.trim().slice(0, MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH)),
    filter((tag) => tag.length > 0),
    uniqBy((tag) => tag.toLocaleLowerCase()),
    take(MAXIMUM_LANGUAGE_LEARNING_TAGS),
  )
