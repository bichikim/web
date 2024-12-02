import {Signal} from 'solid-js'

export type MaybeSignal<T> = Signal<T> | T
