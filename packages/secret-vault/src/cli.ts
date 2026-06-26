/* eslint-disable no-console */
import process from 'node:process'
import {Command, Option} from 'commander'
import {
  addSecret,
  createRepo,
  exportSecrets,
  importSecrets,
  initVault,
  listSecrets,
  modifySecret,
  syncSecrets,
} from './commands'
import {SecretVaultError} from './errors'
import {createPrompt, readStdinText} from './prompt'
import {runCommand} from './process'
import type {StorageMode} from './types'

interface GlobalOptions {
  readonly config?: string
  readonly namespace?: string
  readonly passphraseEnv?: boolean
  readonly passphraseStdin?: boolean
}

const storageOption = new Option('--storage <mode>', 'Storage mode')
  .choices(['encrypted', 'plain'])
  .default('encrypted')

const createCommandOptions = (command: Command) => {
  const options = command.optsWithGlobals<GlobalOptions>()

  return {
    configPath: options.config,
    cwd: process.cwd(),
    namespace: options.namespace,
    prompt: createPrompt({
      passphraseEnv: options.passphraseEnv === true,
      passphraseStdin: options.passphraseStdin === true,
    }),
    readStdin: readStdinText,
    runner: runCommand,
  }
}

const handleError = (error: unknown) => {
  if (error instanceof SecretVaultError) {
    console.error(error.message)
    process.exitCode = error.exitCode

    return
  }

  throw error
}

const program = new Command()

program
  .name('secret-vault')
  .description('Private git-backed secret vault')
  .option('-c, --config <path>', 'Config path')
  .option('-n, --namespace <name>', 'Vault namespace override')
  .option('--passphrase-stdin', 'Read encrypted vault passphrase from stdin')
  .option('--passphrase-env', 'Read encrypted vault passphrase from SECRET_VAULT_PASSPHRASE')

program
  .command('init')
  .description('Create .secret-vault.json')
  .option('--create-repo <name>', 'Create a private GitHub vault repository')
  .option('--repository <url>', 'Vault repository URL')
  .addOption(storageOption)
  .action(
    async (
      options: {
        createRepo?: string
        repository?: string
        storage: StorageMode
      },
      command,
    ) => {
      try {
        await initVault({
          ...createCommandOptions(command),
          createRepoName: options.createRepo,
          repository: options.repository,
          storage: options.storage,
        })
      } catch (error) {
        handleError(error)
      }
    },
  )

const repo = program.command('repo').description('Manage vault repository')

repo
  .command('create <name>')
  .description('Create a private GitHub vault repository')
  .action(async (name: string, command) => {
    try {
      const repository = await createRepo(name, createCommandOptions(command))

      console.log(repository)
    } catch (error) {
      handleError(error)
    }
  })

program
  .command('add <input>')
  .description('Add a secret')
  .option('--stdin', 'Read secret value from stdin')
  .option('--value <value>', 'Secret value')
  .action(async (input: string, options: {stdin?: boolean; value?: string}, command) => {
    try {
      const changed = await addSecret(input, {
        ...createCommandOptions(command),
        stdin: options.stdin,
        value: options.value,
      })

      if (changed) {
        console.log('Secret saved')
      }
    } catch (error) {
      handleError(error)
    }
  })

program
  .command('modify <input>')
  .description('Modify a secret')
  .option('--stdin', 'Read secret value from stdin')
  .option('--value <value>', 'Secret value')
  .action(async (input: string, options: {stdin?: boolean; value?: string}, command) => {
    try {
      const changed = await modifySecret(input, {
        ...createCommandOptions(command),
        stdin: options.stdin,
        value: options.value,
      })

      if (changed) {
        console.log('Secret saved')
      }
    } catch (error) {
      handleError(error)
    }
  })

program
  .command('import [source]')
  .description('Import secrets from a dotenv file')
  .option('--stdin', 'Read dotenv content from stdin')
  .option('--confirm-overwrite', 'Prompt once before overwriting existing keys')
  .action(
    async (
      source: string | undefined,
      options: {confirmOverwrite?: boolean; stdin?: boolean},
      command,
    ) => {
      try {
        const keys = await importSecrets(source, {
          ...createCommandOptions(command),
          confirmOverwrite: options.confirmOverwrite,
          stdin: options.stdin,
        })

        console.log(`Imported ${keys.length} secret${keys.length === 1 ? '' : 's'}`)
      } catch (error) {
        handleError(error)
      }
    },
  )

program
  .command('list')
  .description('List secret keys')
  .action(async (_options, command) => {
    try {
      const keys = await listSecrets(createCommandOptions(command))

      for (const key of keys) {
        console.log(key)
      }
    } catch (error) {
      handleError(error)
    }
  })

program
  .command('sync')
  .description('Export vault secrets to the configured env file')
  .option('--out <path>', 'Override export path')
  .action(async (options: {out?: string}, command) => {
    try {
      const result = await syncSecrets({
        ...createCommandOptions(command),
        out: options.out,
      })

      if (!result.skipped) {
        console.log(
          `Synced ${result.keyCount} secret${result.keyCount === 1 ? '' : 's'} to ${result.exportPath}`,
        )
      }
    } catch (error) {
      handleError(error)
    }
  })

program
  .command('export')
  .description('Print dotenv values')
  .option('--out <path>', 'Write dotenv output to a file')
  .action(async (options: {out?: string}, command) => {
    try {
      const content = await exportSecrets({
        ...createCommandOptions(command),
        out: options.out,
      })

      if (options.out === undefined && content !== '') {
        console.log(content)
      }
    } catch (error) {
      handleError(error)
    }
  })

program.parseAsync(process.argv).catch(handleError)
