import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it, vi} from 'vitest'
import {type CoremlRuntimeSystem, createCoremlRuntimeProvisioner} from '../coreml-runtime'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
  vi.clearAllMocks()
})

const createDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'natural-lint-coreml-'))
  temporaryPaths.push(directory)
  return directory
}

it('should provision a pinned isolated runtime and reuse it', async () => {
  const runtimeDir = await createDirectory()
  const download = vi.fn(async (_url: string, destination: string) => {
    await writeFile(destination, 'verified archive')
  })
  const run = vi.fn(async (command: string, arguments_: ReadonlyArray<string>) => {
    if (command === '/usr/bin/tar') {
      const destination = arguments_[arguments_.indexOf('-C') + 1]
      await mkdir(destination, {recursive: true})
      await writeFile(path.join(destination, 'uv'), '#!/bin/sh')
      await chmod(path.join(destination, 'uv'), 0o755)
      return
    }
    if (arguments_[0] === 'venv') {
      const environmentDir = arguments_.at(-1)
      if (environmentDir === undefined) {
        throw new Error('Missing environment directory.')
      }
      await mkdir(path.join(environmentDir, 'bin'), {recursive: true})
      await writeFile(path.join(environmentDir, 'bin/python'), '#!/bin/sh')
      await chmod(path.join(environmentDir, 'bin/python'), 0o755)
    }
  })
  const system: CoremlRuntimeSystem = {
    arch: 'arm64',
    download,
    platform: 'darwin',
    release: '24.6.0',
    run,
  }
  const ensureRuntime = createCoremlRuntimeProvisioner(system)

  const first = await ensureRuntime(runtimeDir)
  const second = await ensureRuntime(runtimeDir)

  expect(first.pythonPath).toBe(path.join(runtimeDir, 'environment-v1/bin/python'))
  expect(first.environment.HF_HOME).toBe(path.join(runtimeDir, 'huggingface'))
  expect(second).toEqual(first)
  expect(download).toHaveBeenCalledTimes(1)
  expect(run).toHaveBeenCalledTimes(3)
  expect(await readFile(path.join(runtimeDir, 'environment-v1/runtime.json'), 'utf8')).toContain(
    'laya-coreml==0.1.0',
  )
})

it('should reject managed CoreML outside its supported operating system boundary', async () => {
  const runtimeDir = await createDirectory()
  const ensureRuntime = createCoremlRuntimeProvisioner({
    arch: 'arm64',
    download: vi.fn(),
    platform: 'darwin',
    release: '23.6.0',
    run: vi.fn(),
  })

  await expect(ensureRuntime(runtimeDir)).rejects.toThrow('macOS 15 or newer')
})
