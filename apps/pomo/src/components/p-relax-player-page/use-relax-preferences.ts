import {z} from 'zod'
import type {Accessor} from 'solid-js'
import {usePreference} from 'src/hooks/use-preference'
import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {RELAX_BACKGROUND_OPTIONS} from './background-options'
import type {RelaxWeather} from './types'

const positionSchema = z.object({
  depth: z.number().min(0).max(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})

export interface RelaxPreferences {
  readonly mistIntensity: Accessor<number>
  readonly selectedBackground: Accessor<string | null>
  readonly selectedDaylightPosition: Accessor<VirtualLightPosition | null>
  readonly weather: Accessor<RelaxWeather>
  readonly setMistIntensity: (intensity: number) => void
  readonly setSelectedBackground: (source: string) => void
  readonly setSelectedDaylightPosition: (position: VirtualLightPosition) => void
  readonly setWeather: (weather: RelaxWeather) => void
}

/** Restores scene choices and persists explicit edits through the shared preference provider. */
export const useRelaxPreferences = (): RelaxPreferences => {
  // Separate keys preserve untouched fields when an edit precedes asynchronous restoration.
  const [selectedBackground, setSelectedBackground] = usePreference<string | null>({
    defaultValue: null,
    key: 'pomo:relax-background:v1',
    parse: (value) =>
      RELAX_BACKGROUND_OPTIONS.find((option) => option.source === value)?.source ?? null,
  })
  const [savedWeather, setWeather] = usePreference<RelaxWeather>({
    defaultValue: 'sunny',
    key: 'pomo:relax-weather:v1',
    parse: (value) => (value === 'sunny' || value === 'rainy' ? value : null),
  })
  const [savedMist, setMistIntensity] = usePreference({
    defaultValue: 1,
    key: 'pomo:relax-mist:v1',
    parse: (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
        ? value
        : null,
  })
  const [selectedDaylightPosition, setSelectedDaylightPosition] =
    usePreference<VirtualLightPosition | null>({
      defaultValue: null,
      key: 'pomo:relax-daylight:v1',
      parse: (value) => {
        const result = positionSchema.safeParse(value)
        return result.success ? result.data : null
      },
    })
  return {
    mistIntensity: () => savedMist() ?? 1,
    selectedBackground,
    selectedDaylightPosition,
    setMistIntensity,
    setSelectedBackground,
    setSelectedDaylightPosition,
    setWeather,
    weather: () => savedWeather() ?? 'sunny',
  }
}
