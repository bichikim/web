import {extname, relative, sep} from 'node:path'
import typescript from '@typescript/typescript6'
import {createDeclarationSources} from './create-declaration-sources'
import {createProjectSettings} from './create-project-settings'
import {createModuleResolutions} from './create-module-resolutions'
import {isWithin} from './file-access'
import {createNavigationFileSystem} from './create-navigation-file-system'
interface NavigationModulesOptions {
  readonly path: string
  readonly root?: string
  readonly read: (path: string) => string | undefined
  readonly filesystem?: ReturnType<typeof createNavigationFileSystem>
}
const extensions = new Map<string, typescript.Extension>([
  ['.ts', typescript.Extension.Ts],
  ['.tsx', typescript.Extension.Tsx],
  ['.mts', typescript.Extension.Mts],
  ['.cts', typescript.Extension.Cts],
  ['.js', typescript.Extension.Js],
  ['.jsx', typescript.Extension.Jsx],
  ['.mjs', typescript.Extension.Mjs],
  ['.cjs', typescript.Extension.Cjs],
])
/** Resolves imports using containing-project settings and workspace declaration origins. */
export const createNavigationModules = ({
  path,
  root,
  read,
  filesystem = createNavigationFileSystem(),
}: NavigationModulesOptions) => {
  const resolutions = createModuleResolutions()
  const settings = createProjectSettings(filesystem.host)
  const initial = settings.read(path)
  const {directory, options} = initial
  const projectSettings = (file: string) =>
    file.split(sep).includes('node_modules') ? initial : settings.read(file)
  const declarations = createDeclarationSources(root ?? directory, read)
  const resolveModule = (
    file: string,
    specifier: string,
    mode?: typescript.ResolutionMode,
    redirected?: typescript.ResolvedProjectReference,
  ): typescript.ResolvedModuleWithFailedLookupLocations => {
    const project = projectSettings(file)
    return resolutions.read({
      cache: project.cache,
      file,
      mode,
      redirected: redirected?.sourceFile.fileName,
      resolve: () => {
        const result = typescript.resolveModuleName(
          specifier,
          file,
          project.options,
          filesystem.host,
          project.cache,
          redirected,
          mode,
        )
        const module = result.resolvedModule
        const workspaceDeclaration =
          module !== undefined &&
          /\.d\.(?:ts|mts|cts)$/u.test(module.resolvedFileName) &&
          isWithin(root ?? directory, module.resolvedFileName) &&
          !relative(root ?? directory, module.resolvedFileName)
            .split(sep)
            .includes('node_modules')
        const original = workspaceDeclaration
          ? declarations.read(module.resolvedFileName)
          : undefined
        if (module === undefined || original === undefined) {
          return workspaceDeclaration ? {...result, workspaceDeclaration} : result
        }
        const extension = extensions.get(extname(original)) ?? typescript.Extension.Ts
        return {
          ...result,
          resolvedModule: {
            ...module,
            extension,
            isExternalLibraryImport: false,
            packageId: undefined,
            resolvedFileName: original,
          },
          workspaceDeclaration,
        }
      },
      specifier,
    })
  }
  // oxlint-disable-next-line max-params -- The TypeScript host callback supplies the containing source as its fifth argument.
  const literals: NonNullable<typescript.LanguageServiceHost['resolveModuleNameLiterals']> = (
    literals,
    file,
    redirected,
    _options,
    source,
  ) =>
    literals.map((literal) =>
      resolveModule(
        file,
        literal.text,
        typescript.getModeForUsageLocation(source, literal, projectSettings(file).options),
        redirected,
      ),
    )
  return {
    candidates: (file: string, specifier: string) => [
      ...new Set(
        ([typescript.ModuleKind.ESNext, typescript.ModuleKind.CommonJS] as const).flatMap(
          (mode) => resolveModule(file, specifier, mode).resolvedModule?.resolvedFileName ?? [],
        ),
      ),
    ],
    clear: () => {
      filesystem.clear()
      resolutions.clear()
      settings.clear()
      declarations.clear()
    },
    complete: () => {
      resolutions.complete()
      filesystem.clear()
    },
    directory,
    filesystem,
    invalidated: resolutions.invalidated,
    literals,
    options,
    resolve: resolveModule,
    update: (paths: readonly string[]): void => {
      if (resolutions.update(paths)) {
        declarations.clear()
      }
    },
  }
}
