import {invoke} from '@tauri-apps/api/core'
import {message} from '@tauri-apps/plugin-dialog'
import {z} from 'zod'

const installedSchema = z.object({inPath: z.boolean(), path: z.string()})

/** Runs only from the user's native menu action; shell profiles and the system PATH stay user-owned. */
export const installDesktopCli = async () => {
  try {
    const installed = installedSchema.parse(await invoke('install_cli'))
    await message(
      `설치 위치: ${installed.path}\n터미널의 PATH에 이 폴더가 포함되어 있어야 합니다.`,
      {title: 'Poffo CLI'},
    )
  } catch (error) {
    await message(error instanceof Error ? error.message : 'CLI를 설치하지 못했습니다.', {
      kind: 'error',
      title: 'Poffo CLI',
    })
  }
}
