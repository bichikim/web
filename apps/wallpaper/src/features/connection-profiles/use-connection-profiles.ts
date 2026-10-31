import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {
  type ConnectionProfile,
  MAX_CONNECTION_BYTES,
  parseConnectionProfile,
} from '@winter-love/wallpaper/settings/connections'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {TrackingParameter} from '../tracking/types'
import {builtinConnectionProfile} from './builtin-profile'
import type {CharacterAction} from '../semantics/types'

interface UseConnectionProfilesOptions {
  readonly widget: Accessor<PoffoWidget | undefined>
  readonly parameters: Accessor<readonly TrackingParameter[]>
  readonly actions?: Accessor<readonly CharacterAction[]>
}
const IMPORT_ERRORS = {
  action: '이 캐릭터에 없는 행동이 포함돼 있어요.',
  character: '다른 기본 캐릭터의 연결 설정이에요.',
  invalid: '연결 JSON의 형식이나 값을 확인해 주세요.',
  parameter: '이 캐릭터에 없는 파라미터가 포함돼 있어요.',
} as const

export const useConnectionProfiles = (options: UseConnectionProfilesOptions) => {
  const repository = createLibraryRepository('wallpaper-library')
  const [error, setError] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)
  let downloadUrl: string | null = null
  let disposed = false
  let pending = Promise.resolve()
  const release = () => {
    if (downloadUrl !== null) {
      URL.revokeObjectURL(downloadUrl)
    }
  }
  onCleanup(() => {
    disposed = true
    release()
    pending.finally(() => repository.close()).catch(console.error)
  })
  const run = (operation: () => Promise<void>) => {
    if (busy() || disposed) {
      return pending
    }
    setError(null)
    setBusy(true)
    pending = operation()
      .catch((cause: unknown) => {
        console.error('Poffo connections could not be processed', cause)
        if (!disposed) {
          setError('연결 설정을 처리하지 못했어요.')
        }
      })
      .finally(() => {
        if (!disposed) {
          setBusy(false)
        }
      })
    return pending
  }
  const importFile = (files: readonly File[]) => {
    const [file] = files
    const widget = options.widget()
    if (file === undefined || widget === undefined) {
      return pending
    }
    return run(async () => {
      if (file.size > MAX_CONNECTION_BYTES) {
        setError('연결 JSON은 256 KB 이하로 선택해 주세요.')
        return
      }
      const source = await file.text()
      if (disposed || options.widget()?.id !== widget.id) {
        return
      }
      const parsed = parseConnectionProfile(source, {
        actions: options.actions?.().map((item) => item.action),
        assetId: widget.assetId,
        parameters: options.parameters(),
      })
      if (!parsed.ok) {
        setError(IMPORT_ERRORS[parsed.reason])
        return
      }
      await repository.configureConnections(widget.id, parsed.profile.connections)
    })
  }
  const exportFile = () => {
    const widget = options.widget()
    if (widget === undefined || disposed) {
      return
    }
    setError(null)
    const profile: ConnectionProfile = {
      assetId: widget.assetId,
      connections: {
        agentBindings: widget.speech?.agentBindings ?? {},
        lipsync: widget.speech?.lipsync ?? {source: 'off'},
        semanticBindings: widget.speech?.semanticBindings ?? [],
        trackingBindings: widget.trackingBindings ?? {},
        trackingOptions: widget.trackingOptions ?? {},
      },
      format: 'poffo-connections',
      version: 1,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(profile, null, 2)], {type: 'application/json'}),
    )
    release()
    downloadUrl = url
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'poffo-connections.json'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }
  const builtin = () => {
    const widget = options.widget()
    return widget === undefined ? undefined : builtinConnectionProfile(widget.assetId)
  }
  const restore = () => {
    const profile = builtin()
    const widget = options.widget()
    return profile === undefined || widget === undefined
      ? pending
      : run(() => repository.configureConnections(widget.id, profile.connections))
  }
  return {busy, error, exportFile, hasBuiltin: () => builtin() !== undefined, importFile, restore}
}
