import {createInfoMap} from './info'
import {setGlobalInfo} from './global-info'

export * from './info'
export * from './global-info'
export * from './types'

setGlobalInfo(createInfoMap())
