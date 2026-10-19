import {relative} from 'node:path'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
import {collectPythonReferences} from './collect-python-references'
import {createPythonService} from './create-python-service'
import {resolveFile} from './file-access'
import {readPythonProject} from './read-python-project'
import type {SourceChange, SymbolLookup} from './types'

export const createPythonNavigation = (root: string) => {
  const services = new Map<string, ReturnType<typeof createPythonService>>()
  let disposed = false
  const serviceFor = (directory: string): Result<ReturnType<typeof createPythonService>> => {
    if (disposed) {
      return failure('python-analysis-failed')
    }
    const existing = services.get(directory)
    if (existing !== undefined) {
      return success(existing)
    }
    try {
      const service = createPythonService(directory)
      services.set(directory, service)
      return success(service)
    } catch {
      return failure('python-analyzer-unavailable')
    }
  }
  const normalize = (targets: readonly CodeLocation[]): CodeLocation[] =>
    targets.flatMap((target) => {
      const file = resolveFile(root, target.path)
      return file.ok ? [{...target, path: relative(root, file.value)}] : []
    })
  const lookupSymbols = async (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ): Promise<Result<CodeLocation[]>> => {
    if (disposed) {
      return failure('python-analysis-failed')
    }
    const selected = readPythonProject(root, path)
    if (lookup.kind === 'definition') {
      const context = serviceFor(selected)
      if (!context.ok) {
        return context
      }
      const result = await context.value.lookupSymbols(path, source, offset, {
        ...lookup,
        receive: (targets) => lookup.receive?.(normalize(targets)),
      })
      return result.ok ? success(normalize(result.value)) : result
    }
    const result = await collectPythonReferences({
      lookup: {...lookup, receive: (targets) => lookup.receive?.(normalize(targets))},
      offset,
      path,
      root,
      service: serviceFor,
      source,
    })
    return result.ok ? success(normalize(result.value)) : result
  }
  return {
    dispose: () => {
      disposed = true
      services.forEach((service) => service.dispose())
      services.clear()
    },
    lookupSymbols,
    update: (changes: readonly SourceChange[]) =>
      services.forEach((service) => service.update(root, changes)),
  }
}
