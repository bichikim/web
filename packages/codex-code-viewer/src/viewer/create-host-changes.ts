import {fileBaselineSchema, workspaceChangesSchema} from '../shared/change-contracts'
import {callViewerTool} from './call-viewer-tool'
import type {ViewerPort} from './types'

export const createHostChanges = (
  call: ViewerPort['call'],
): Pick<ViewerPort, 'readChanges' | 'readBaseline'> => ({
  readBaseline: (session, path) =>
    callViewerTool({
      input: {path, session},
      name: 'code.changes',
      port: {call},
      schema: fileBaselineSchema,
    }),
  readChanges: (session) =>
    callViewerTool({
      input: {session},
      name: 'code.changes',
      port: {call},
      schema: workspaceChangesSchema,
    }),
})
