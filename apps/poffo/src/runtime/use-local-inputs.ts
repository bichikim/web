import {isLocalInput} from '../tracking/local-inputs'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import {type PuppetDocument, type PuppetParameterValueMap} from '@winter-love/puppet/player'

import {mapTrackingValues} from '../tracking/map-tracking-values'
import type {LocalInput, RuntimeProfile} from '../tracking/types'
interface UseLocalInputsProps {
  readonly document: Accessor<PuppetDocument | undefined>
  readonly profile: Accessor<RuntimeProfile | undefined>
  readonly updateProfile: (profile: RuntimeProfile) => void
}
const MILLISECONDS_PER_SECOND = 1000
const VALUE_TOLERANCE = 0.0001
export const useLocalInputs = (props: UseLocalInputsProps) => {
  const [localValues, setLocalValues] = createSignal<PuppetParameterValueMap>({})
  const inputValues = createMemo<Readonly<Record<LocalInput, number>>>(() => ({
    buttonValue: 0,
    manualValue: 0,
    ...props.profile()?.inputs,
  }))
  createEffect(on(props.document, () => setLocalValues({})))
  createEffect(() => {
    const values = inputValues()
    const mappings =
      props.profile()?.mappings.filter((mapping) => isLocalInput(mapping.input)) ?? []
    const target = mapTrackingValues({elapsed: 0, mappings, values})
    if (typeof requestAnimationFrame === 'undefined' || Object.keys(target).length === 0) {
      setLocalValues(target)
      return
    }
    let previous = untrack(localValues)
    let timestamp: number | undefined
    let frame: number
    const advance = (current: number) => {
      const elapsed = timestamp === undefined ? 0 : (current - timestamp) / MILLISECONDS_PER_SECOND
      timestamp = current
      previous = mapTrackingValues({elapsed, mappings, previous, values})
      setLocalValues(previous)
      if (
        Object.entries(target).some(
          ([id, value]) => Math.abs(value - previous[id]!) > VALUE_TOLERANCE,
        )
      ) {
        frame = requestAnimationFrame(advance)
      } else {
        setLocalValues(target)
      }
    }
    frame = requestAnimationFrame(advance)
    onCleanup(() => cancelAnimationFrame(frame))
  })
  const setInputValue = (input: LocalInput, value: number) => {
    const profile = props.profile()
    if (profile !== undefined && Number.isFinite(value)) {
      props.updateProfile({
        ...profile,
        inputs: {...inputValues(), [input]: Math.min(1, Math.max(0, value))},
      })
    }
  }
  return {inputValues, localValues, setInputValue}
}
