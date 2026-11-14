import {createContext, useContext} from 'solid-js'
import type {WorkspaceContextValue} from './types'
export const WorkspaceContext = createContext<WorkspaceContextValue>()
export const useWorkspace = () => useContext(WorkspaceContext)
