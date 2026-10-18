import {existsSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
import {createRubyService} from './create-ruby-service'
import {isWithin, readSource, resolveFile} from './file-access'
import {readRubyRequire} from './read-ruby-require'
import {isRubyDeclaration} from './is-ruby-declaration'
import type {SourceChange, SymbolLookup} from './types'

export const createRubyNavigation = (root: string) => {
  const services = new Map<string, ReturnType<typeof createRubyService>>()
  let disposed = false
  const projectRoot = (path: string): string => {
    let directory = dirname(path)
    while (isWithin(root, directory)) {
      const candidate = directory
      if (['Gemfile', 'gems.rb'].some((name) => existsSync(join(candidate, name)))) {
        return directory
      }
      if (directory === root) {
        return root
      }
      directory = dirname(directory)
    }
    return root
  }
  const lookupSymbols = async (
    path: string,
    source: string,
    offset: number,
    lookup: SymbolLookup,
  ): Promise<Result<CodeLocation[]>> => {
    const {kind} = lookup
    if (disposed) {
      return failure('ruby-analysis-failed')
    }
    const required = readRubyRequire(source, offset)
    if (kind === 'definition' && required?.kind === 'relative') {
      const extension = required.path.endsWith('.rb') ? '' : '.rb'
      const file = resolveFile(root, resolve(dirname(path), `${required.path}${extension}`))
      return success(file.ok ? [{column: 1, line: 1, path: relative(root, file.value)}] : [])
    }
    const directory = kind === 'references' ? root : projectRoot(path)
    let service = services.get(directory)
    if (service === undefined) {
      try {
        service = createRubyService(directory)
        services.set(directory, service)
      } catch {
        return failure('ruby-analyzer-unavailable')
      }
    }
    const normalize = (targets: readonly CodeLocation[]): CodeLocation[] =>
      targets.flatMap((target) => {
        const file = resolveFile(root, target.path)
        if (!file.ok) {
          return []
        }
        const document = file.value === path ? success(source) : readSource(root, file.value)
        if (!document.ok) {
          return []
        }
        const line = document.value.split(/\r\n|\n|\r/u)[target.line - 1] ?? ''
        const column = [...line].slice(0, target.column - 1).join('').length + 1
        if (kind === 'references' && isRubyDeclaration(line, column)) {
          return []
        }
        return [{...target, column, path: relative(root, file.value)}]
      })
    const progress =
      lookup.receive === undefined
        ? lookup
        : {
            ...lookup,
            receive: (targets: readonly CodeLocation[]) => lookup.receive?.(normalize(targets)),
          }
    const result = await service.lookupSymbols(path, source, offset, progress)
    return result.ok ? success(normalize(result.value)) : result
  }
  const dispose = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    for (const service of services.values()) {
      service.dispose()
    }
    services.clear()
  }
  return {
    dispose,
    lookupSymbols,
    update: (changes: readonly SourceChange[]) => {
      for (const [directory, service] of services) {
        service.update(
          root,
          changes.filter((change) => isWithin(directory, change.path)),
        )
      }
    },
  }
}
