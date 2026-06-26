import {execa, type Options as ExecaOptions} from 'execa'
import {SecretVaultError} from './errors'
import type {CommandRunner} from './types'

const formatCommandLabel = (file: string, args: readonly string[]) => `${file} ${args.join(' ')}`

const formatCommandFailure = (error: unknown, commandLabel: string) => {
  if (error instanceof SecretVaultError) {
    return error.message
  }

  if (error !== null && typeof error === 'object') {
    const commandError = error as {message?: string; stderr?: unknown; stdout?: unknown}
    const lines = [
      String(commandError.stdout ?? '').trim(),
      String(commandError.stderr ?? '').trim(),
      String(commandError.message ?? 'Command failed').trim(),
    ].filter((line) => line !== '')

    if (lines.length > 0) {
      return `Command failed (${commandLabel}):\n${lines.join('\n')}`
    }
  }

  return `Command failed (${commandLabel})`
}

export const runCommand: CommandRunner = async (
  file: string,
  args: readonly string[],
  options?: ExecaOptions,
) => {
  const commandLabel = formatCommandLabel(file, args)

  try {
    const result = await execa(file, [...args], options)

    return {
      stderr: String(result.stderr ?? ''),
      stdout: String(result.stdout ?? ''),
    }
  } catch (error) {
    throw new SecretVaultError(formatCommandFailure(error, commandLabel))
  }
}
