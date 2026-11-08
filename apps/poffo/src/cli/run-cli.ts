import {z} from 'zod'
import {recipeSchema} from './recipe-types'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseCliArguments} from './parse-cli-arguments'
import {readConnection, sendCommand} from './connection'
import {runMcp} from './run-mcp'
import {runShell} from './run-shell'
import {startCliHost} from './start-cli-host'
import {executeCliOperation} from './execute-cli-operation'
import {stopHost} from './stop-host'
import {installCli} from './install-cli'
import {readRuntimeInfo} from './read-runtime-info'
import {runRecipe} from './run-recipe'

const HELP = `Poffo — one model session for GUI, CLI and agents
  poffo dev [--cli] [--workspace DIR] [--file PATH]
  poffo start [--cli] [--workspace DIR] [--file PATH]
  poffo status | inspect | operations | skill | doctor
  poffo install-cli [--directory DIR]
  poffo open PATH | save PATH [--format json|poffo] [--overwrite]
  poffo preview PATCH.json
  poffo apply PATCH.json --revision N --fingerprint HASH
  poffo undo | redo | shell | mcp
  poffo call OPERATION [--input JSON | --input-file PATH]
  poffo recipe FILE.json [--resume] | recipe-schema
  poffo stop [--discard]
File paths are resolved within --workspace (default: current directory).
`

const print = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`)

export const runCli = async (args: ReadonlyArray<string>): Promise<void> => {
  const {positionals, values} = parseCliArguments(args)
  const [command = 'help', argument] = positionals
  if (values.help === true || command === 'help') {
    process.stdout.write(HELP)
    return
  }
  if (command === 'doctor') {
    print(await readRuntimeInfo())
    return
  }
  if (command === 'install-cli') {
    print(await installCli(values.directory))
    return
  }
  if (command === 'recipe-schema') {
    print(z.toJSONSchema(recipeSchema, {io: 'input'}))
    return
  }
  if (command === 'skill') {
    print({path: fileURLToPath(new URL('../skills/poffo-authoring/SKILL.md', import.meta.url))})
    return
  }
  const workspace = resolve(values.workspace ?? process.cwd())
  if (command === 'start' || command === 'dev') {
    print(await startCliHost(command, workspace, values))
    return
  }
  const connection = await readConnection(workspace)
  if (command === 'recipe') {
    if (argument === undefined) {
      throw new Error('Specify a recipe file')
    }
    print(
      await runRecipe({
        execute: (request) => sendCommand(connection, request),
        path: argument,
        resume: values.resume,
        workspace,
      }),
    )
    return
  }
  if (command === 'mcp') {
    await runMcp(connection)
    return
  }
  if (command === 'shell') {
    await runShell(connection)
    return
  }
  if (command === 'stop') {
    print(await stopHost(connection, workspace, values.discard === true))
    return
  }
  const result = await executeCliOperation({argument, command, connection, values, workspace})
  print(result)
  if (!result.ok) {
    process.exitCode = 1
  }
}
