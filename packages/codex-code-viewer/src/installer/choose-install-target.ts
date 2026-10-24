import {createInterface} from 'node:readline/promises'
import {stdin, stdout} from 'node:process'
import type {InstallTarget} from './parse-install-command'

/** Reads one installation target from the terminal, closing the prompt on exit or cancellation. */
export const chooseInstallTarget = async (): Promise<InstallTarget> => {
  const prompt = createInterface({input: stdin, output: stdout})
  try {
    console.log(
      'Where would you like to install?\n  1. Codex\n  2. Claude Desktop — Code mode\n  3. Both',
    )
    const answer = (await prompt.question('Choose [1/2/3]: ')).trim()
    switch (answer) {
      case '1':
        return 'codex'
      case '2':
        return 'claude'
      case '3':
        return 'all'
      default:
        throw new Error('Installation was not started. Run again and choose 1, 2, or 3.')
    }
  } finally {
    prompt.close()
  }
}
