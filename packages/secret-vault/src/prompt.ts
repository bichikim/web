import readline from 'node:readline'
import {stdin as defaultStdin, stdout as defaultStdout} from 'node:process'
import type {Readable, Writable} from 'node:stream'
import {SecretVaultError} from './errors'
import type {Prompt} from './types'

const SIGINT_EXIT_CODE = 130

interface TtyReadable extends Readable {
  readonly isTTY?: boolean
  setRawMode?: (mode: boolean) => void
}

export const confirm = async (message: string) => {
  const answer = await new Promise<string>((resolve) => {
    const interfaceValue = readline.createInterface({
      input: defaultStdin,
      output: defaultStdout,
    })

    interfaceValue.question(`${message} (y/N) `, (value) => {
      interfaceValue.close()
      resolve(value.trim().toLowerCase())
    })
  })

  return answer === 'y' || answer === 'yes'
}

export const readStdinText = async (input: Readable = defaultStdin) => {
  const chunks: Buffer[] = []

  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }

  return Buffer.concat(chunks).toString('utf8').trimEnd()
}

export const promptHidden = async (
  message: string,
  input: TtyReadable = defaultStdin,
  output: Writable = defaultStdout,
) => {
  output.write(message)

  if (!input.isTTY || input.setRawMode === undefined) {
    const interfaceValue = readline.createInterface({input, output})

    return new Promise<string>((resolve) => {
      interfaceValue.question('', (value) => {
        interfaceValue.close()
        resolve(value)
      })
    })
  }

  return new Promise<string>((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      input.setRawMode?.(false)
      input.off('keypress', onKeypress)
      output.write('\n')
    }

    const onKeypress = (chunk: string, key: readline.Key) => {
      if (key.ctrl === true && key.name === 'c') {
        cleanup()
        reject(new SecretVaultError('Passphrase prompt cancelled', SIGINT_EXIT_CODE))

        return
      }

      if (key.name === 'return' || key.name === 'enter') {
        cleanup()
        resolve(value)

        return
      }

      if (key.name === 'backspace') {
        value = value.slice(0, -1)

        return
      }

      if (chunk !== undefined && chunk >= ' ') {
        value += chunk
      }
    }

    readline.emitKeypressEvents(input)
    input.setRawMode?.(true)
    input.on('keypress', onKeypress)
    input.resume()
  })
}

export interface CreatePromptOptions {
  readonly passphraseEnv?: boolean
  readonly passphraseStdin?: boolean
  readonly readStdin?: () => Promise<string>
}

export const readPassphrase = async (options: CreatePromptOptions = {}) => {
  const passphraseStdin = options.passphraseStdin === true
  const passphraseEnv = options.passphraseEnv === true

  if (passphraseStdin && passphraseEnv) {
    throw new SecretVaultError('Use only one of --passphrase-stdin or --passphrase-env')
  }

  if (passphraseEnv) {
    const envValue = process.env.SECRET_VAULT_PASSPHRASE

    if (envValue === undefined || envValue === '') {
      throw new SecretVaultError('SECRET_VAULT_PASSPHRASE is not set')
    }

    process.stderr.write(
      'Warning: using SECRET_VAULT_PASSPHRASE from environment; prefer --passphrase-stdin in CI.\n',
    )

    return envValue
  }

  if (passphraseStdin) {
    return (options.readStdin ?? readStdinText)()
  }

  return promptHidden('Passphrase: ')
}

export const createPrompt = (options: CreatePromptOptions = {}): Prompt => {
  return {
    confirm,
    passphrase: () => readPassphrase(options),
    value: (key) => promptHidden(`Value for ${key}: `),
  }
}
