import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'

const REGIONS = [
  {name: 'FrontLeft', parameters: ['19', '20', '21', '28', '29', '30']},
  {name: 'FrontRight', parameters: ['22', '24', '23', '28', '29', '30']},
  {name: 'FrontCenter', parameters: ['25', '26', '27', '28', '29', '30']},
  {name: 'SideLeft', parameters: ['19', '20', '21', '28', '29', '30']},
  {name: 'SideRight', parameters: ['22', '24', '23', '28', '29', '30']},
] as const

export const isolateHairTouch = (touch: PoffoTouch, defaults: PoffoTouch): PoffoTouch => {
  const retired = new Set(REGIONS.flatMap((region) => region.parameters.map((id) => `Param${id}`)))
  const isolated = REGIONS.flatMap((region) =>
    region.parameters.flatMap((parameter) => {
      const source = touch.parameters?.[`Param${parameter}`]
      const id = `TouchHair${region.name}${parameter}`
      const replacement = defaults.parameters?.[id]
      if (source === undefined || replacement === undefined) {
        return []
      }
      // The retired single-parameter bindings resolved their automatic axis to X.
      const sourceAxis = source.axis
      const axis = sourceAxis === undefined || sourceAxis === 'auto' ? 'x' : sourceAxis
      const sourceParts = source.parts
      const parts =
        sourceParts === undefined
          ? replacement.parts
          : replacement.parts?.filter((part) => sourceParts.includes(part))
      return parts?.length === 0 ? [] : [[id, {...replacement, ...source, axis, parts}] as const]
    }),
  )
  return {
    ...touch,
    parameters: {
      ...Object.fromEntries(
        Object.entries(touch.parameters ?? {}).filter(([id]) => !retired.has(id)),
      ),
      ...Object.fromEntries(isolated),
    },
  }
}
