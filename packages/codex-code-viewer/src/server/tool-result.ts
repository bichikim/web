import type {Result} from '../shared/contracts'

export const toolResult = <Value extends Record<string, unknown>>(result: Result<Value>) =>
  result.ok
    ? {
        content: [],
        structuredContent: {...result.value},
      }
    : {
        content: [{text: JSON.stringify(result.error), type: 'text' as const}],
        isError: true,
        structuredContent: {...result.error},
      }
