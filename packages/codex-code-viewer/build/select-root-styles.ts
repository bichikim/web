interface RootStylesInput {
  readonly rules: string
  readonly preflights: string
}
const references = (value: string): readonly string[] =>
  [...value.matchAll(/var\((?<name>--[\w-]+)/gu)].map((match) => match.groups?.name ?? '')

/** Retains generated flat root variables referenced by vector rules, including theme overrides. */
export const selectRootStyles = ({rules, preflights}: RootStylesInput): string => {
  const roots = [
    ...preflights.matchAll(/(?<selector>:root(?:\[[^\]]+\])?)\s*\{(?<body>[^{}]*)\}/gu),
  ].map((match) => ({
    declarations: [
      ...(match.groups?.body ?? '').matchAll(/(?<name>--[\w-]+)\s*:\s*(?<value>[^;]+);/gu),
    ].map((declaration) => ({
      name: declaration.groups?.name ?? '',
      value: declaration.groups?.value.trim() ?? '',
    })),
    selector: match.groups?.selector ?? '',
  }))
  const definitions = roots.flatMap((root) => root.declarations)
  const needed = new Set(references(rules))
  for (const name of needed) {
    for (const declaration of definitions.filter((entry) => entry.name === name)) {
      for (const dependency of references(declaration.value)) {
        needed.add(dependency)
      }
    }
  }
  const variables = roots
    .map(
      (root) =>
        `${root.selector}{${root.declarations
          .filter((entry) => needed.has(entry.name))
          .map((entry) => `${entry.name}:${entry.value}`)
          .join(';')}}`,
    )
    .join('')
  return variables + rules
}
