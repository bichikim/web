import {relative} from 'node:path'
import {
  type CodeLocation,
  failure,
  type NavigationKind,
  type Result,
  success,
} from '../shared/contracts'
import {createPythonService} from './create-python-service'
import {resolveFile} from './file-access'

export const createPythonNavigation = (root: string) => {
  let service: ReturnType<typeof createPythonService> | null = null
  let disposed = false
  const lookupSymbols = async (
    path: string,
    source: string,
    offset: number,
    kind: NavigationKind,
  ): Promise<Result<CodeLocation[]>> => {
    if (disposed) {
      return failure('python-analysis-failed')
    }
    if (service === null) {
      try {
        service = createPythonService(root)
      } catch {
        return failure('python-analyzer-unavailable')
      }
    }
    const result = await service.lookupSymbols(path, source, offset, kind)
    if (!result.ok) {
      return result
    }
    return success(
      result.value.flatMap((target) => {
        const file = resolveFile(root, target.path)
        return file.ok ? [{...target, path: relative(root, file.value)}] : []
      }),
    )
  }
  const dispose = (): void => {
    disposed = true
    service?.dispose()
    service = null
  }
  return {dispose, lookupSymbols}
}
