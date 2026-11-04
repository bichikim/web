import {connectCharacterLook as connect} from '../../look'
import {frames} from './frames'

export const connectCharacterLook = (options: Parameters<typeof connect>[0]) =>
  connect({...options, frames})
