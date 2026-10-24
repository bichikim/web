export interface ImportMetaEnvValues {
  readonly [name: string]: string
}

export const createImportMetaEnvDefinitions = (
  values: ImportMetaEnvValues,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      `import.meta.env.${name}`,
      JSON.stringify(value),
    ]),
  )
