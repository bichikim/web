import {parseArgs} from 'node:util'
import type {InspectionMode} from '../inspection/index'

export interface HelpCommand {
  readonly command: 'help'
}
export interface InspectionEvalCommand {
  readonly command: 'eval-inspection'
  readonly datasetPath: string
  readonly reportPath: string
  readonly baseline?: string
  readonly outputPath?: string
  readonly json: boolean
}
export interface GenerateCommand {
  readonly cacheDirectory?: string
  readonly command: 'eval-generate'
  readonly inputPath: string
  readonly json: boolean
  readonly limit: number
  readonly model: string
  readonly outputPath: string
}
export interface ApproveCommand {
  readonly candidatePath: string
  readonly command: 'eval-approve'
  readonly ids: ReadonlyArray<string>
  readonly json: boolean
  readonly outputPath: string
  readonly reviewer: string
}
export interface EvalCommand {
  readonly baseline?: string
  readonly command: 'eval'
  readonly cutoff: number
  readonly datasetPath: string
  readonly inputPath: string
  readonly json: boolean
}
export interface RepositoryCommand {
  readonly command: 'index' | 'status' | 'mcp'
  readonly inputPath: string
  readonly json: boolean
}
export interface SearchCommand {
  readonly command: 'search'
  readonly inputPath: string
  readonly json: boolean
  readonly query: string
  readonly limit: number
}
export interface DoctorCommand {
  readonly inspectionMode?: InspectionMode
  readonly cacheDirectory?: string
  readonly command: 'doctor'
  readonly inputPath: string
  readonly json: boolean
  readonly limit?: number
  readonly model?: string
}
export interface GetCommand {
  readonly command: 'get'
  readonly inputPath: string
  readonly json: boolean
  readonly logicalId: string
}
export interface ReindexCommand {
  readonly command: 'reindex'
  readonly inputPath: string
  readonly json: boolean
  readonly confirmed: boolean
}
export type KnowledgeCommand =
  | HelpCommand
  | RepositoryCommand
  | SearchCommand
  | GetCommand
  | ReindexCommand
  | EvalCommand
  | GenerateCommand
  | ApproveCommand
  | DoctorCommand
  | InspectionEvalCommand

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100
const parseLimit = (value: string | undefined): number => {
  const limit = value === undefined ? DEFAULT_LIMIT : Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error('Invalid limit')
  }
  return limit
}
const requiredArgument = (value: string | undefined): string => {
  if (value === undefined || value.trim() === '') {
    throw new Error('Missing argument')
  }
  return value
}
const repositoryPath = (argument: string | undefined, repo: string | undefined): string => {
  if (argument !== undefined && repo !== undefined) {
    throw new Error('Conflicting repository paths')
  }
  return argument ?? repo ?? process.cwd()
}

interface CommandFlags {
  readonly 'inspection-mode'?: string
  readonly report?: string
  readonly 'cache-dir'?: string
  readonly ids?: string
  readonly model?: string
  readonly output?: string
  readonly repo?: string
  readonly reviewer?: string
  readonly baseline?: string
  // eslint-disable-next-line id-length -- Public metric notation uses --k.
  readonly k?: string
  readonly yes?: boolean
  readonly limit?: string
  readonly json?: boolean
}
const COMMAND_FLAGS: Readonly<Record<string, ReadonlyArray<string>>> = {
  doctor: ['repo', 'json', 'model', 'cache-dir', 'limit', 'inspection-mode'],
  eval: ['repo', 'json', 'baseline', 'k'],
  'eval-approve': ['ids', 'reviewer', 'output', 'json'],
  'eval-generate': ['repo', 'json', 'model', 'output', 'cache-dir', 'limit'],
  'eval-inspection': ['report', 'baseline', 'output', 'json'],
  get: ['repo', 'json'],
  help: [],
  index: ['repo', 'json'],
  mcp: ['repo'],
  reindex: ['repo', 'json', 'yes'],
  search: ['repo', 'json', 'limit'],
  status: ['repo', 'json'],
}
const invalidFlags = (command: string | undefined, flags: CommandFlags): boolean => {
  if (
    command === 'doctor' &&
    flags.model === undefined &&
    (flags.limit !== undefined ||
      flags['cache-dir'] !== undefined ||
      flags['inspection-mode'] !== undefined)
  ) {
    return true
  }
  const allowed = COMMAND_FLAGS[command ?? ''] ?? []
  return Object.entries(flags).some(([key, value]) => value !== undefined && !allowed.includes(key))
}
const optionalArgument = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : requiredArgument(value)
const parseInspectionMode = (value: string): InspectionMode => {
  switch (value) {
    case 'combined':
    case 'separated':
    case 'contextual':
    case 'research':
      return value
    default:
      throw new Error('Invalid inspection mode')
  }
}

interface ParseDoctorCommandOptions extends CommandFlags {
  readonly argument: string | undefined
}
const parseDoctorCommand = (options: ParseDoctorCommandOptions): DoctorCommand => {
  const inputPath = repositoryPath(options.argument, options.repo)
  const base = {command: 'doctor', inputPath, json: options.json ?? false} as const
  return options.model === undefined
    ? base
    : {
        ...base,
        cacheDirectory: optionalArgument(options['cache-dir']),
        ...(options['inspection-mode'] === undefined
          ? {}
          : {inspectionMode: parseInspectionMode(options['inspection-mode'])}),
        limit: parseLimit(options.limit),
        model: requiredArgument(options.model),
      }
}

/** Parses CLI inputs; invalid combinations return undefined without running a command. */
export const parseKnowledgeArguments = (
  arguments_: ReadonlyArray<string>,
): KnowledgeCommand | undefined => {
  try {
    const {positionals, values} = parseArgs({
      allowPositionals: true,
      args: [...arguments_],
      options: {
        baseline: {type: 'string'},
        'cache-dir': {type: 'string'},
        help: {short: 'h', type: 'boolean'},
        ids: {type: 'string'},
        'inspection-mode': {type: 'string'},
        json: {type: 'boolean'},
        // eslint-disable-next-line id-length -- Public metric notation uses --k.
        k: {type: 'string'},
        limit: {type: 'string'},
        model: {type: 'string'},
        output: {type: 'string'},
        repo: {type: 'string'},
        report: {type: 'string'},
        reviewer: {type: 'string'},
        yes: {type: 'boolean'},
      },
      strict: true,
    })
    if (values.help || arguments_.length === 0) {
      return {command: 'help'}
    }
    const [command, argument] = positionals
    if (positionals.length > 2 || invalidFlags(command, values)) {
      return undefined
    }
    const json = values.json ?? false
    const inputPath = values.repo ?? process.cwd()
    switch (command) {
      case 'eval-inspection':
        return {
          baseline: optionalArgument(values.baseline),
          command,
          datasetPath: requiredArgument(argument),
          json,
          outputPath: optionalArgument(values.output),
          reportPath: requiredArgument(values.report),
        }
      case 'eval-generate':
        return {
          cacheDirectory: optionalArgument(values['cache-dir']),
          command,
          inputPath: repositoryPath(argument, values.repo),
          json,
          limit: parseLimit(values.limit),
          model: requiredArgument(values.model),
          outputPath: requiredArgument(values.output),
        }
      case 'eval-approve':
        return {
          candidatePath: requiredArgument(argument),
          command,
          ids: requiredArgument(values.ids)
            .split(',')
            .map((id) => requiredArgument(id.trim())),
          json,
          outputPath: requiredArgument(values.output),
          reviewer: requiredArgument(values.reviewer),
        }
      case 'eval':
        return {
          baseline: values.baseline,
          command,
          cutoff: parseLimit(values.k),
          datasetPath: requiredArgument(argument),
          inputPath,
          json,
        }
      case 'mcp':
        return {command, inputPath: repositoryPath(argument, values.repo), json: false}
      case 'doctor':
        return parseDoctorCommand({...values, argument})
      case 'index':
      case 'status':
        return {command, inputPath: repositoryPath(argument, values.repo), json}
      case 'reindex':
        return {
          command,
          confirmed: values.yes ?? false,
          inputPath: repositoryPath(argument, values.repo),
          json,
        }
      case 'get':
        return {
          command,
          inputPath,
          json,
          logicalId: requiredArgument(argument),
        }
      case 'search':
        return {
          command,
          inputPath,
          json,
          limit: parseLimit(values.limit),
          query: requiredArgument(argument),
        }
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}
