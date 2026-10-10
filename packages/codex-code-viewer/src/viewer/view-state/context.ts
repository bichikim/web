import {createContext, untrack, useContext} from 'solid-js'
import type {ViewStateContextValue} from './types'

export const ViewStateContext = createContext<ViewStateContextValue>()
export const useFileViewState = () => untrack(() => useContext(ViewStateContext)?.bind())
