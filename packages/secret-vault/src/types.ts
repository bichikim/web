import type {Options as ExecaOptions} from 'execa'

export type StorageMode = 'encrypted' | 'plain'

export interface SecretVaultConfig {
  readonly exportPath?: string
  readonly namespace?: string
  readonly repository: string
  readonly storage?: StorageMode
}

export interface ResolvedConfig extends SecretVaultConfig {
  readonly configPath: string
  readonly exportPath: string
  readonly storage: StorageMode
}

export interface CommandResult {
  readonly stderr: string
  readonly stdout: string
}

export type CommandRunner = (
  file: string,
  args: readonly string[],
  options?: ExecaOptions,
) => Promise<CommandResult>

export interface Prompt {
  readonly confirm: (message: string) => Promise<boolean>
  readonly passphrase: () => Promise<string>
  readonly value: (key: string) => Promise<string>
}

export type VaultValues = Record<string, string>
