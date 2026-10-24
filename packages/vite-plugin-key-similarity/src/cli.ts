import {stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {glob} from 'tinyglobby'
import {resolveOptions} from './config'
import {KeySimilarityCore} from './core'
import type {KeySimilarityOptions} from './types'

export interface CliArguments {
  readonly command: 'benchmark' | 'check'
  readonly configPath: string
  readonly json: boolean
}

const parseArguments = (arguments_: ReadonlyArray<string>): CliArguments => {
  const [command] = arguments_
  if (command !== 'benchmark' && command !== 'check') {
    throw new Error('Usage: key-similarity <benchmark|check> [--config path] [--json]')
  }
  const configIndex = arguments_.indexOf('--config')
  return {
    command,
    configPath: configIndex === -1 ? 'key-similarity.config.mjs' : arguments_[configIndex + 1]!,
    json: arguments_.includes('--json'),
  }
}

const loadOptions = async (configPath: string): Promise<KeySimilarityOptions> => {
  const absolutePath = path.resolve(configPath)
  const imported = (await import(pathToFileURL(absolutePath).href)) as {default?: unknown}
  if (!imported.default || typeof imported.default !== 'object') {
    throw new Error(`Config must default-export key similarity options: ${absolutePath}`)
  }
  return imported.default as KeySimilarityOptions
}

export const runCli = async (arguments_: ReadonlyArray<string>): Promise<number> => {
  const argumentsValue = parseArguments(arguments_)
  const root = process.cwd()
  return runCliWithOptions(argumentsValue, await loadOptions(argumentsValue.configPath), root)
}

export const runCliWithOptions = async (
  argumentsValue: CliArguments,
  sourceOptions: KeySimilarityOptions,
  root: string,
): Promise<number> => {
  const options = resolveOptions(sourceOptions, root)
  const core = new KeySimilarityCore(options)
  const report = await core.initialize()

  if (argumentsValue.command === 'benchmark') {
    const warmReport = await core.initialize()
    const cacheFiles = await glob('vectors/*.f32', {
      absolute: true,
      cwd: options.cacheDir,
      onlyFiles: true,
    })
    const cacheSizes = await Promise.all(
      cacheFiles.map(async (filePath) => (await stat(filePath)).size),
    )
    process.stdout.write(
      `${JSON.stringify(
        {
          cacheBytes: cacheSizes.reduce((sum, size) => sum + size, 0),
          initial: report,
          memoryRssBytes: process.memoryUsage().rss,
          warm: warmReport,
        },
        null,
        2,
      )}\n`,
    )
    return 0
  }

  if (argumentsValue.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    const summary = [
      `Scanned ${report.filesScanned} files and ${report.uniqueKeys} unique keys;`,
      `found ${report.diagnostics.length} diagnostics.`,
    ].join(' ')
    process.stdout.write(`${summary}\n`)
  }
  return report.diagnostics.length > 0 ? 1 : 0
}

const executablePath = process.argv.at(1)
if (
  executablePath !== undefined &&
  path.resolve(executablePath) === path.resolve(fileURLToPath(import.meta.url))
) {
  runCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    },
  )
}
