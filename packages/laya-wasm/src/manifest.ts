import type {Manifest, ParameterLayout} from './types'

export const parameterLayout = (width: number): readonly ParameterLayout[] => [
  {dimensions: [width], name: 'norm_scale'},
  {dimensions: [width], name: 'norm_bias'},
  {dimensions: [width, width], name: 'hidden_weight'},
  {dimensions: [width], name: 'hidden_bias'},
  {dimensions: [width, 1], name: 'output_weight'},
  {dimensions: [1], name: 'output_bias'},
]

export const readObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a JSON object.')
  }
  return Object.fromEntries(Object.entries(value))
}

const integer = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('Model dimensions must be positive integers.')
  }
  return value
}
const text = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Missing model metadata.')
  }
  return value
}
const temperature = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError('Temperatures must be positive finite numbers.')
  }
  return value
}

export const parseManifest = (value: unknown): Manifest => {
  const metadata = readObject(value)
  if (metadata.version !== 1) {
    throw new TypeError('Unsupported bundle version.')
  }
  const config = readObject(metadata.config)
  const questionTypes = 3
  const width = integer(metadata.width)
  const parameters = parameterLayout(width)
  if (
    !Array.isArray(metadata.parameters) ||
    metadata.parameters.length !== parameters.length ||
    !metadata.parameters.every((item: unknown, index: number) => {
      const entry = readObject(item)
      return (
        entry.name === parameters[index].name &&
        JSON.stringify(entry.dimensions) === JSON.stringify(parameters[index].dimensions)
      )
    })
  ) {
    throw new TypeError('Unsupported scorer parameter layout.')
  }
  if (!Array.isArray(config.temperature) || config.temperature.length !== questionTypes) {
    throw new TypeError('Expected three question temperatures.')
  }
  const external = metadata.externalData
  if (!Array.isArray(external)) {
    throw new TypeError('Missing external data manifest.')
  }
  const externalData = external.map((item: unknown) => {
    const location = text(item)
    if (
      location.startsWith('/') ||
      location.includes('\\') ||
      location
        .split('/')
        .some(
          (part) =>
            part === '..' ||
            part === '.' ||
            part.includes(':') ||
            part.includes('%') ||
            part.includes('?') ||
            part.includes('#'),
        )
    ) {
      throw new TypeError('External data paths must be relative bundle paths.')
    }
    return location
  })
  const maximum = integer(config.max_len)
  const head = integer(config.head_max_len)
  if (head >= maximum) {
    throw new TypeError('Head length must be smaller than context length.')
  }
  return {
    config: {
      headLength: head,
      maxLength: maximum,
      optionTemperatures: Object.fromEntries(
        Object.entries(readObject(config.temperature_by_options ?? {})).map(([key, entry]) => [
          key,
          temperature(entry),
        ]),
      ),
      temperature: config.temperature.map(temperature),
    },
    externalData,
    featureOutput: text(metadata.featureOutput),
    modelId: text(metadata.modelId),
    parameters,
    version: 1,
    width,
  }
}
