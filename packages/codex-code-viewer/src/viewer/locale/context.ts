import {type Accessor, createContext} from 'solid-js'
import type {ViewerLanguage} from './types'

export const LocaleContext = createContext<Accessor<ViewerLanguage>>((): ViewerLanguage => 'ko')
