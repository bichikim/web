import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'

/** Selects configured project members and visible files not covered by any selected project. */
export const readProjectDocuments = (
  root: string,
  files: readonly string[],
  host: typescript.System,
): readonly string[] => {
  const configurations = new Map<string, string>()
  const groups = Map.groupBy(files, (file) => {
    const directory = dirname(resolve(root, file))
    let configuration = configurations.get(directory)
    if (configuration === undefined) {
      configuration = typescript.findConfigFile(directory, host.fileExists) ?? root
      configurations.set(directory, configuration)
    }
    return configuration
  })
  const projects = [...groups].map(([configuration, paths]) => {
    const parsed =
      configuration === root
        ? undefined
        : typescript.getParsedCommandLineOfConfigFile(
            configuration,
            {},
            {
              ...host,
              onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                throw new Error(
                  typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                )
              },
            },
          )
    const included = new Set(parsed?.fileNames)
    const members = paths.filter((path) => included.has(resolve(root, path)))
    const representative =
      members.find((path) => path.includes('/src/') && !path.includes('__tests__')) ?? members[0]
    return {included, representative}
  })
  // Only projects opened through an actual member contribute coverage; excluded files still need opening.
  const configured = projects.filter((project) => project.representative !== undefined)
  const covered = new Set(configured.flatMap((project) => [...project.included]))
  return [
    ...new Set([
      ...configured.flatMap((project) => project.representative ?? []),
      ...files.filter((file) => !covered.has(resolve(root, file))),
    ]),
  ]
}
