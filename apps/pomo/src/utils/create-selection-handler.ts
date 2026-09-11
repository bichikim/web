import {keyBy} from 'es-toolkit/array'

/** Accepts only values from the initial choices, preserving their literal type. */
export const createSelectionHandler = <Value extends string>(
  values: readonly Value[],
  onChange: (value: Value) => void,
): ((value: string) => void) => {
  const choices: Partial<Record<string, Value>> = keyBy(values, (value) => `:${value}`)
  return (value) => {
    const selected = choices[`:${value}`]
    if (selected !== undefined) {
      onChange(selected)
    }
  }
}
