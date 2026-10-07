import {existsSync} from 'node:fs'
import {dirname, join, relative} from 'node:path'
import {type CodeLocation, type Result, success} from '../shared/contracts'
import {createRustService} from './create-rust-service'
import {isWithin, resolveFile} from './file-access'

export const createRustNavigation = (root: string) => {
  const services = new Map<string, ReturnType<typeof createRustService>>()
  const definitions = async (
    path: string,
    source: string,
    offset: number,
  ): Promise<Result<CodeLocation[]>> => {
    let directory = dirname(path)
    while (
      directory !== root &&
      isWithin(root, dirname(directory)) &&
      !existsSync(join(directory, 'Cargo.toml'))
    ) {
      directory = dirname(directory)
    }
    const manifest = existsSync(join(directory, 'Cargo.toml'))
    const key = manifest ? directory : path
    let service = services.get(key)
    if (service === undefined) {
      service = createRustService({directory, file: path, manifest})
      services.set(key, service)
    }
    const targets = await service.definitions(path, source, offset)
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
    for (const service of services.values()) {
      service.dispose()
    }
    services.clear()
  }
  return {definitions, dispose}
}
