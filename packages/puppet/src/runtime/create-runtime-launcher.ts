import {useWorkspace} from '../workspace/context'
import type {Accessor} from 'solid-js'
import type {PuppetDocument} from '../player'
import {openRuntime} from './open-runtime'
interface CreateRuntimeLauncherOptions {
  readonly document: Accessor<PuppetDocument>
  readonly motionId: Accessor<string | undefined>
  readonly onError: (message: string) => void
}
export const createRuntimeLauncher = (options: CreateRuntimeLauncherOptions) => {
  const workspace = useWorkspace()
  const open = async (page: 'studio' | 'viewer', signal?: AbortSignal) => {
    try {
      if (workspace === undefined) {
        await openRuntime({
          document: options.document(),
          motionId: options.motionId(),
          page,
          signal,
        })
      } else {
        await workspace.openRuntime(page, options.document(), options.motionId(), signal)
      }
    } catch (cause) {
      if (!signal?.aborted) {
        options.onError(cause instanceof Error ? cause.message : '새 화면을 열지 못했습니다.')
      }
    }
  }
  return {
    openStudio: (signal?: AbortSignal) => open('studio', signal),
    openViewer: (signal?: AbortSignal) => open('viewer', signal),
  }
}
