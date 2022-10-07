import {computed as _computed, batch, signal} from '@preact/signals'
import {createComputed, createIsRef, createRef, createUnref} from './create'

export const ref = createRef(signal)
export const computed = createComputed(_computed, batch)
export const isRef = createIsRef()
export const unref = createUnref(isRef)
