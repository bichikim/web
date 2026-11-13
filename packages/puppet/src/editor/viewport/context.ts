import {createContext} from 'solid-js'
import type {ViewportHost} from './types'

export const ViewportContext = createContext<ViewportHost>()
