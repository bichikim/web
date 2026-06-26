import {afterEach, describe, expect, it, vi} from 'vitest'
import * as prompt from '../prompt'

describe('readPassphrase', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should read passphrase from env when passphraseEnv is enabled', async () => {
    vi.stubEnv('SECRET_VAULT_PASSPHRASE', 'from-env')

    await expect(prompt.readPassphrase({passphraseEnv: true})).resolves.toBe('from-env')
  })

  it('should ignore env when passphraseEnv is not enabled', async () => {
    vi.stubEnv('SECRET_VAULT_PASSPHRASE', 'from-env')

    await expect(
      prompt.readPassphrase({
        passphraseStdin: true,
        readStdin: async () => 'from-stdin',
      }),
    ).resolves.toBe('from-stdin')
  })

  it('should reject passphraseEnv when env is missing', async () => {
    await expect(prompt.readPassphrase({passphraseEnv: true})).rejects.toThrow(
      'SECRET_VAULT_PASSPHRASE is not set',
    )
  })

  it('should reject using passphrase stdin and env together', async () => {
    await expect(
      prompt.readPassphrase({passphraseEnv: true, passphraseStdin: true}),
    ).rejects.toThrow('Use only one of --passphrase-stdin or --passphrase-env')
  })
})
