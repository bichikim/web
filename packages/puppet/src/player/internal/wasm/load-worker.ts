import initialize from './runtime.wasm?init'
import {createWasmWorker} from './create-worker'

/** Loads the complete Worker runtime into its own linear memory. */
export const loadWasmWorker = async () => createWasmWorker(await initialize())
