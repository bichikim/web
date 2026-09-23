const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const hasValidParameterOptions = (value: Record<string, unknown>) => {
  if (value.options === undefined) {
    return true
  }
  if (!Array.isArray(value.options) || value.options.length < 2) {
    return false
  }

  const {options} = value
  return (
    options.every(
      (option) =>
        isRecord(option) &&
        typeof option.label === 'string' &&
        option.label.length > 0 &&
        isFiniteNumber(option.value) &&
        isFiniteNumber(value.minimum) &&
        isFiniteNumber(value.maximum) &&
        option.value >= value.minimum &&
        option.value <= value.maximum,
    ) &&
    new Set(options.map((option) => option.value)).size === options.length &&
    options.every(
      (option, index) =>
        index === 0 ||
        (isRecord(options[index - 1]) &&
          isRecord(option) &&
          options[index - 1].value! < option.value!),
    ) &&
    options.some((option) => isRecord(option) && option.value === value.defaultValue)
  )
}
