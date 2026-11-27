import {createContext, useContext} from 'solid-js'
import type {WorkspaceContextValue} from './types'
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
export const useWorkspace = () => useContext(WorkspaceContext) ?? undefined
