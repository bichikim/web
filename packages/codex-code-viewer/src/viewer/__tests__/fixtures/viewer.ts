import {createRoot} from 'solid-js'
import {vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {CodeDocument, ViewerSession} from '../../../shared/contracts'
import type {ViewerPort} from '../../types'
import {useViewer} from '../../use-viewer'

export const document = (path: string): CodeDocument => ({
  lines: Array.from({length: 12}, () => []),
  location: {column: 1, line: 1, path},
  revision: path,
  source: path,
})
export const initial: ViewerSession = {
  document: document('main.tsx'),
  session: 'session',
  workspace: '/project',
}
export const result = (path: string): CallToolResult => ({
  content: [],
  structuredContent: {document: document(path)},
})
export const createPort = (): ViewerPort => ({
  call: vi.fn(async (_name, input) => result(String(input.path))),
  context: vi.fn<ViewerPort['context']>().mockResolvedValue(undefined),
  start: async (receive) => {
    receive(initial)
    return vi.fn<() => void>()
  },
})
export const createViewerFixture = () => {
  let cleanup: (() => void) | undefined
  return {
    dispose: () => cleanup?.(),
    mount: (port: ViewerPort) =>
      createRoot((dispose) => {
        cleanup = dispose
        return useViewer(port)
      }),
  }
}
