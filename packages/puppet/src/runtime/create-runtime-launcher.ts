import type {Accessor} from 'solid-js'
import type {PuppetDocument} from '../player'
import {openRuntime} from './open-runtime'
interface CreateRuntimeLauncherOptions {
  readonly document: Accessor<PuppetDocument>
  readonly motionId: Accessor<string | undefined>
  readonly onError: (message: string) => void
}
export const createRuntimeLauncher = (options: CreateRuntimeLauncherOptions) => {
  const open = async (page: 'studio' | 'viewer') => {
    try {
      await openRuntime({document: options.document(), motionId: options.motionId(), page})
    } catch (cause) {
      options.onError(cause instanceof Error ? cause.message : '새 화면을 열지 못했습니다.')
    }
  }
  return {openStudio: () => open('studio'), openViewer: () => open('viewer')}
}
