import type {Result} from '../shared/contracts'

const deferredSource = (document: unknown): Record<string, unknown> => {
  if (
    typeof document !== 'object' ||
    document === null ||
    !('readOnly' in document) ||
    document.readOnly !== true ||
    !('source' in document) ||
    typeof document.source !== 'string'
  ) {
    return {}
  }
  return {document: {...document, source: '', sourceLength: document.source.length}}
}

export const toolResult = <Value extends Record<string, unknown>>(result: Result<Value>) =>
  result.ok
    ? {
        content: [],
        structuredContent: {...result.value, ...deferredSource(result.value.document)},
      }
    : {
        content: [{text: JSON.stringify(result.error), type: 'text' as const}],
        isError: true,
        structuredContent: {...result.error},
      }
