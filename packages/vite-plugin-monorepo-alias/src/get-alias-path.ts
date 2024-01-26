export type Alias = ((workspacePath: string) => string | undefined) | string | string[]

export const getAliasPath = (workspacePath: string, alias: Alias) => {
  // todo
}
