import {relative, resolve, sep} from 'node:path'
import typescript from '@typescript/typescript6'
import {fileFormat} from '../../shared/file-formats'
import type {FileSummary, IndexedSource} from './types'
import {createNavigationModules} from '../create-navigation-modules'
/** Resolves cached imports with the same project settings and declaration origins as semantic queries. */
export const createModuleResolver = (root: string, sources: ReadonlyMap<string, IndexedSource>) => {
  const modules = createNavigationModules({
    path: resolve(root, 'index.ts'),
    read: typescript.sys.readFile,
    root,
  })
  return (path: string, source: IndexedSource): FileSummary => {
    let uncertain = source.summary.uncertain || fileFormat(path)?.kind !== 'code'
    const dependencies = source.summary.imports.flatMap((specifier) => {
      const targets = modules.candidates(resolve(root, path), specifier)
      if (targets.length === 0) {
        uncertain = true
        return []
      }
      return targets.flatMap((target) => {
        const normalized = relative(root, target).split(sep).join('/')
        if (!sources.has(normalized)) {
          uncertain = true
          return []
        }
        return [normalized]
      })
    })
    return {
      dependencies,
      fingerprint: JSON.stringify([source.summary.fingerprint, dependencies, uncertain]),
      names: source.summary.names,
      surface: source.summary.surface,
      uncertain,
    }
  }
}
