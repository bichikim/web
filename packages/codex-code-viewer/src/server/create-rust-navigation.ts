import {relative} from 'node:path'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
import {createRustService} from './create-rust-service'
import {resolveFile} from './file-access'
import {readProject} from './rust/read-project'
import {collectSyntaxReferences} from './collect-syntax-references'
import type {SourceChange, SymbolLookup} from './types'
export const createRustNavigation = (root: string) => {
  const services = new Map<
    string,
    {
      signature: string
      service: ReturnType<typeof createRustService>
    }
  >()
  let disposed = false
  const serviceFor = (path: string): Result<ReturnType<typeof createRustService>> => {
    if (disposed) {
      return failure('rust-analysis-failed')
    }
    const project = readProject({file: path, root})
    if (!project.ok) {
      return project
    }
    const {directory} = project.value
    const signature = JSON.stringify(project.value)
    let entry = services.get(directory)
    if (entry === undefined || entry.signature !== signature) {
      entry?.service.dispose()
      entry = {service: createRustService(project.value), signature}
      services.set(directory, entry)
    }
    return success(entry.service)
  }
  const lookupSymbols = async (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ): Promise<Result<CodeLocation[]>> => {
    if (disposed) {
      return failure('rust-analysis-failed')
    }
    const selected = serviceFor(path)
    if (!selected.ok) {
      return selected
    }
    const receive =
      lookup.receive === undefined
        ? undefined
        : (targets: readonly CodeLocation[]) =>
            lookup.receive?.(
              targets.flatMap((target) => {
                const file = resolveFile(root, target.path)
                return file.ok ? [{...target, path: relative(root, file.value)}] : []
              }),
            )
    const progress = {...lookup, ...(receive === undefined ? {} : {receive})}
    const service = selected.value
    const candidates = new Map<string, ReturnType<typeof serviceFor>>([[path, selected]])
    const query = (
      candidate: string,
      text: string,
      position: number,
      request: SymbolLookup,
    ): Promise<Result<CodeLocation[]>> => {
      const context = candidates.get(candidate) ?? serviceFor(candidate)
      candidates.set(candidate, context)
      if (!context.ok) {
        return Promise.resolve(context)
      }
      return candidate === path
        ? context.value.lookupSymbols(candidate, text, position, {...request, draft: lookup.draft})
        : context.value.lookupIndexedSymbols(candidate, text, position, request)
    }
    const verified =
      lookup.kind === 'references'
        ? await collectSyntaxReferences({
            language: 'rust',
            lookup: progress,
            offset,
            path,
            query,
            root,
            source,
          })
        : success([])
    if (!verified.ok) {
      return verified
    }
    const targets = await service.lookupSymbols(path, source, offset, progress)
    if (!targets.ok) {
      return targets
    }
    const unique = new Map(
      [...verified.value, ...targets.value].map((target) => [
        JSON.stringify([target.path, target.line, target.column]),
        target,
      ]),
    )
    const locations = [...unique.values()].flatMap((target) => {
      const file = resolveFile(root, target.path)
      return file.ok ? [{...target, path: relative(root, file.value)}] : []
    })
    return success(locations)
  }
  const dispose = (): void => {
    disposed = true
    for (const entry of services.values()) {
      entry.service.dispose()
    }
    services.clear()
  }
  return {
    dispose,
    lookupSymbols,
    update: (changes: readonly SourceChange[]) => {
      for (const entry of services.values()) {
        entry.service.update(root, changes)
      }
    },
  }
}
