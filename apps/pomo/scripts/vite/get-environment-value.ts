export interface GetEnvironmentValueOptions {
  readonly environment: Readonly<Record<string, string | undefined>>
  readonly name: string
}

export const getEnvironmentValue = ({
  environment,
  name,
}: GetEnvironmentValueOptions): string | undefined => {
  const value = environment[name]?.trim()
  return value === '' ? undefined : value
}
