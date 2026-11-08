import {readFile} from 'node:fs/promises'
import {resolveWorkspacePath} from '../backend/node/resolve-workspace-path'
import {randomUUID} from 'node:crypto'
import {sendCommand} from './connection'
import type {HostConnection} from '../backend/node/start-node-host'
import type {parseCliArguments} from './parse-cli-arguments'

interface ExecuteCliOperationOptions {
  readonly command: string
  readonly argument?: string
  readonly workspace: string
  readonly values: ReturnType<typeof parseCliArguments>['values']
  readonly connection: HostConnection
}

const readJson = async (workspace: string, path: string) =>
  JSON.parse(await readFile(await resolveWorkspacePath(workspace, path, 'read'), 'utf8')) as unknown

const editInput = async (options: ExecuteCliOperationOptions, expectedRevision: number) => {
  const {argument, command, values, workspace} = options
  if (argument === undefined) {
    throw new Error('Specify a patch file')
  }
  if (command === 'apply' && (values.revision === undefined || values.fingerprint === undefined)) {
    throw new Error('Apply requires the preview revision and fingerprint')
  }
  return {
    expectedRevision,
    fingerprint: values.fingerprint,
    patch: await readJson(workspace, argument),
  }
}

/** Converts convenience commands to the same operations exposed to agents. */
export const executeCliOperation = async (options: ExecuteCliOperationOptions) => {
  const {command, argument, workspace, values, connection} = options
  const execute = (operation: string, input?: unknown) =>
    sendCommand(connection, {input, operation, requestId: randomUUID()})
  const reads: Readonly<Record<string, string>> = {
    inspect: 'document.inspect',
    operations: 'operations.list',
    status: 'status',
  }
  const read = reads[command]
  if (read !== undefined) {
    return execute(read)
  }
  if (command === 'call') {
    if (argument === undefined) {
      throw new Error('Specify an operation')
    }
    const input =
      values['input-file'] === undefined
        ? values.input === undefined
          ? {}
          : (JSON.parse(values.input) as unknown)
        : await readJson(workspace, values['input-file'])
    return execute(argument, input)
  }
  const status = await execute('status')
  if (!status.ok) {
    return status
  }
  const expectedRevision = values.revision === undefined ? status.revision : Number(values.revision)
  switch (command) {
    case 'undo':
    case 'redo':
      return execute(`history.${command}`, {expectedRevision})
    case 'open':
      if (argument === undefined) {
        throw new Error('Specify an input path')
      }
      return execute('document.open', {expectedRevision, path: argument})
    case 'save':
      if (argument === undefined) {
        throw new Error('Specify an output path')
      }
      return execute('document.save', {
        expectedRevision,
        format: values.format ?? (argument.endsWith('.json') ? 'json' : 'poffo'),
        overwrite: values.overwrite === true,
        path: argument,
      })
    case 'preview':
    case 'apply':
      return execute(`edit.${command}`, await editInput(options, expectedRevision))
    default:
      throw new Error(`Unknown command: ${command}`)
  }
}
