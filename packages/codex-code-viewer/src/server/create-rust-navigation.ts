import {relative} from 'node:path'
import {type CodeLocation, failure, type Result, success} from '../shared/contracts'
import {createRustService} from './create-rust-service'
import {resolveFile} from './file-access'
import {readProject} from './rust/read-project'

export const createRustNavigation = (root: string) => {
  const services = new Map<
    string,
    {signature: string; service: ReturnType<typeof createRustService>}
  >()
  let disposed = false
  const definitions = async (
    path: string,
    source: string,
    offset: number,
  ): Promise<Result<CodeLocation[]>> => {
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
    const targets = await entry.service.definitions(path, source, offset)
    if (!targets.ok) {
      return targets
    }
    const locations = targets.value.flatMap((target) => {
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
  return {definitions, dispose}
}
