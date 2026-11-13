import initialize from './kernel.wasm?init'
import type {PuppetDocument} from '../../../document'
import {createWasmTransform} from './create-transform'
import type {NativeTransformFactory} from '../../create-native-deformation'

/** Creates Worker-owned memory; unavailable Wasm keeps the JavaScript Worker implementation. */
export const loadWasmTransform = async (
  document: PuppetDocument,
): Promise<NativeTransformFactory | undefined> => {
  if (typeof WebAssembly === 'undefined') {
    return undefined
  }
  let instance: WebAssembly.Instance
  try {
    instance = await initialize()
  } catch (cause) {
    if (cause instanceof WebAssembly.CompileError || cause instanceof TypeError) {
      return undefined
    }
    throw cause
  }
  return createWasmTransform(document, instance)
}
