import typescript from '@typescript/typescript6'

interface ModuleCandidatesOptions {
  readonly path: string
  readonly specifier: string
  readonly options: typescript.CompilerOptions
  readonly cache: typescript.ModuleResolutionCache
}

/** Returns distinct module destinations for import and require resolution modes. */
export const resolveModuleCandidates = ({
  path,
  specifier,
  options,
  cache,
}: ModuleCandidatesOptions): string[] => {
  const modes = [typescript.ModuleKind.ESNext, typescript.ModuleKind.CommonJS] as const
  return [
    ...new Set(
      modes.flatMap((mode) => {
        const target = typescript.resolveModuleName(
          specifier,
          path,
          options,
          typescript.sys,
          cache,
          undefined,
          mode,
        ).resolvedModule
        return target === undefined ? [] : [target.resolvedFileName]
      }),
    ),
  ]
}
