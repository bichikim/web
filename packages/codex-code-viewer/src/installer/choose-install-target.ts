import {createInterface} from 'node:readline/promises'
import {stdin, stdout} from 'node:process'
import type {InstallTarget} from './parse-install-command'

/** Reads one installation target from the terminal, closing the prompt on exit or cancellation. */
export const chooseInstallTarget = async (): Promise<InstallTarget> => {
  const prompt = createInterface({input: stdin, output: stdout})
  try {
    console.log('어디에 설치할까요?\n  1. Codex\n  2. Claude Desktop — Code 모드\n  3. 둘 다')
    const answer = (await prompt.question('선택 [1/2/3]: ')).trim()
    switch (answer) {
      case '1':
        return 'codex'
      case '2':
        return 'claude'
      case '3':
        return 'all'
      default:
        throw new Error('설치를 시작하지 않았습니다. 1, 2, 3 중에서 선택해 다시 실행하세요.')
    }
  } finally {
    prompt.close()
  }
}
