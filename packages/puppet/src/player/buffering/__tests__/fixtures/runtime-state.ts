import {createEmptyDocument} from '../../../create-empty-document'
import {createBufferEngine} from '../../create-buffer-engine'
export const createState = () =>
  createBufferEngine(createEmptyDocument()).step(0, new ArrayBuffer(0)).state
