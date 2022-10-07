import type {ReadonlySignal} from '@preact/signals'
import {Batch, createWriteComputed, WriteComputed} from './write-computed'
import type {ComputedRef, WritableComputedRef} from 'vue'

export type Computed<T = any> = (compute: () => T) => ReadonlySignal<T>

export interface VueComputed {
  <T = any>(compute: () => T): ComputedRef<T>
  <T = any>(compute: WriteComputed<T>): WritableComputedRef<T>
}

export const createComputed = (computed: Computed, batch: Batch): VueComputed => {
  return (<T>(compute: (() => T) | WriteComputed<T>) => {
    if (typeof compute === 'function') {
      return computed(compute)
    }
    return createWriteComputed(computed, batch)(compute)
  }) as any
}
