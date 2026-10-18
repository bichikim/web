import {uniq} from 'es-toolkit/array'
import type {ResponseOutputItem} from 'openai/resources/responses/responses'

/** Returns search source URLs unchanged, in first-seen order without duplicates. */
export const extractSearchSourceUrls = (
  output: ReadonlyArray<ResponseOutputItem>,
): ReadonlyArray<string> =>
  uniq(
    output.flatMap((item) =>
      item.type === 'web_search_call' && item.action.type === 'search'
        ? (item.action.sources ?? []).map((source) => source.url)
        : [],
    ),
  )
