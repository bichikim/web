import {expandGroupValues} from '../tracking/expand-group-values'
import {calibrateMouthValues} from '../tracking/mouth-calibration'
import {useLocalInputs} from './use-local-inputs'
import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from '../player'
import {useRuntimeHotkeys} from './use-runtime-hotkeys'
import {useRuntimeProfile} from './use-runtime-profile'
import {mapTrackingValues} from '../tracking/map-tracking-values'
import {useParameterMappings} from './use-parameter-mappings'
import type {MappingValues, TrackingFrame, TrackingValues} from '../tracking/types'

interface UseRuntimeControlsProps {
  readonly document: Accessor<PuppetDocument | undefined>
  readonly onMotion: (motionId: string) => void
}

const MILLISECONDS_PER_SECOND = 1000

export const useRuntimeControls = (props: UseRuntimeControlsProps) => {
  const settings = useRuntimeProfile(props.document)
  const {profile} = settings
  const {updateProfile} = settings
  const mappings = useParameterMappings({profile, updateProfile})
  const local = useLocalInputs({document: props.document, profile, updateProfile})
  const [manual, setManual] = createSignal<PuppetParameterValueMap>({})
  const [tracked, setTracked] = createSignal<PuppetParameterValueMap>({})
  const [activeExpression, setActiveExpression] = createSignal<string | null>(null)
  const [raw, setRaw] = createSignal<TrackingValues | null>(null)
  const [trackingInputs, setTrackingInputs] = createSignal<TrackingValues | null>(null)
  const mappingInputs = createMemo<MappingValues>(() => ({
    ...trackingInputs(),
    ...local.inputValues(),
  }))
  let lastTimestamp: number | undefined
  createEffect(
    on(props.document, () => {
      setManual({})
      setTracked({})
      setActiveExpression(null)
      setRaw(null)
      setTrackingInputs(null)
      lastTimestamp = undefined
    }),
  )
  const handleFrame = (frame: TrackingFrame) => {
    setRaw(frame.values)
    if (frame.values === null) {
      setTrackingInputs(null)
      lastTimestamp = undefined
      setTracked({})
      return
    }
    const values = calibrateMouthValues(frame.values, profile()?.mouth)
    setTrackingInputs(values)
    const elapsed =
      lastTimestamp === undefined
        ? 0
        : Math.max(0, (frame.timestamp - lastTimestamp) / MILLISECONDS_PER_SECOND)
    lastTimestamp = frame.timestamp
    setTracked((previous) =>
      mapTrackingValues({elapsed, mappings: profile()?.mappings ?? [], previous, values}),
    )
  }
  const toggleExpression = (id: string) =>
    setActiveExpression((current) => (current === id ? null : id))
  useRuntimeHotkeys({onExpression: toggleExpression, onMotion: (id) => props.onMotion(id), profile})
  createEffect(
    on(profile, () => {
      setTracked({})
      lastTimestamp = undefined
    }),
  )
  const correctionValues = createMemo(() => ({...tracked(), ...local.localValues()}))
  const mappedValues = createMemo(() => ({
    ...correctionValues(),
    ...profile()?.expressions.find((preset) => preset.id === activeExpression())?.values,
    ...manual(),
  }))
  const values = createMemo(() =>
    expandGroupValues({
      groups: profile()?.groups ?? [],
      parameters: props.document()?.parameters ?? [],
      values: mappedValues(),
    }),
  )
  return {
    ...settings,
    ...local,
    ...mappings,
    activeExpression,
    addExpression: (name: string) => {
      const current = profile()
      if (current !== undefined && Object.keys(manual()).length > 0) {
        const id = crypto.randomUUID()
        updateProfile({
          ...current,
          expressions: [
            ...current.expressions,
            {id, key: '', name: name.trim() || '표정', values: manual()},
          ],
        })
        setManual({})
        setActiveExpression(id)
      }
    },
    calibrate: () => mappings.calibrateMappings(trackingInputs()),
    clearManual: () => setManual({}),
    correctionValues,
    handleFrame,
    manual,
    mappedValues,
    mappingInputs,
    profile,
    raw,
    setManual: (id: string, value: number | undefined) =>
      setManual((current) =>
        value === undefined
          ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== id))
          : {...current, [id]: value},
      ),
    toggleExpression,
    trackingInputs,
    values,
  }
}
export type RuntimeControls = ReturnType<typeof useRuntimeControls>
