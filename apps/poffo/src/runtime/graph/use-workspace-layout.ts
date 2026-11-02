import {parseStudioFile, type StudioFile} from './parse-studio-file'
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import {reconcile, type SetStoreFunction} from 'solid-js/store'
import type {Node} from '@dschz/solid-flow'
import type {RuntimeControls} from '../use-runtime-controls'
import {
  applyWorkspaceCollapse,
  applyWorkspacePositions,
  parseWorkspaceLayout,
  type WorkspaceLayout,
} from './workspace-layout'
interface UseWorkspaceLayoutProps {
  /** Current Studio profile and its update/import commands. */
  readonly controls: RuntimeControls
  /** Current graph nodes, including positions captured in layout snapshots. */
  readonly nodes: Accessor<Node[]>
  /** Applies restored positions after the profile rebuilds graph membership. */
  readonly setNodes: SetStoreFunction<Node[]>
  /** Parameter ports explicitly added to the graph. */
  readonly extraPorts: Accessor<readonly string[]>
  /** Restores the explicitly added ports from a layout snapshot. */
  readonly setExtraPorts: (ids: string[]) => void
  /** Cards hidden from the current graph. */
  readonly hiddenIds: Accessor<readonly string[]>
  /** Restores hidden cards from a layout snapshot. */
  readonly restoreHiddenIds: (ids: readonly string[]) => void
  /** Borrowed layout storage; omitted, use the page's sessionStorage. */
  readonly sessionStorage?: Pick<Storage, 'getItem' | 'setItem'>
}
const storageKey = (signature: string) => `puppet:studio-layout:v1:${signature}`
export const useWorkspaceLayout = (props: UseWorkspaceLayoutProps) => {
  const [restoring, setRestoring] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  let importVersion = 0
  let restoreVersion = 0
  onCleanup(() => {
    disposed = true
    importVersion += 1
  })
  const snapshot = (): WorkspaceLayout | undefined => {
    const profile = props.controls.profile()
    return profile === undefined
      ? undefined
      : {
          collapsedCorrections: profile.mappings
            .filter((mapping) => mapping.collapsed)
            .map((mapping) => mapping.parameterId),
          collapsedGroups:
            profile.groups?.filter((group) => group.collapsed).map((group) => group.id) ?? [],
          collapsedInputs: profile.collapsedInputs ?? [],
          expandedSections: profile.expandedSections ?? [],
          extraPorts: props.extraPorts(),
          hiddenIds: props.hiddenIds(),
          positions: props
            .nodes()
            .filter((node) => node.parentId === undefined)
            .map((node) => ({id: node.id, x: node.position.x, y: node.position.y})),
          signature: profile.signature,
          version: 1,
        }
  }
  const restore = (layout: WorkspaceLayout, profile = props.controls.profile()) => {
    if (profile === undefined || profile.signature !== layout.signature) {
      return
    }
    restoreVersion += 1
    const version = restoreVersion
    setRestoring(true)
    batch(() => {
      props.setExtraPorts([...layout.extraPorts])
      props.restoreHiddenIds(layout.hiddenIds)
      props.controls.updateProfile(applyWorkspaceCollapse(profile, layout))
    })
    // Restore positions after the profile change rebuilds graph membership.
    queueMicrotask(() => {
      if (disposed || version !== restoreVersion) {
        return
      }
      if (props.controls.profile()?.signature === layout.signature) {
        props.setNodes(reconcile(applyWorkspacePositions(props.nodes(), layout.positions)))
      }
      setRestoring(false)
    })
  }
  const signature = createMemo(() => props.controls.profile()?.signature)
  createEffect(
    on(signature, (signature) => {
      if (signature === undefined) {
        return
      }
      try {
        const storage = props.sessionStorage ?? globalThis.sessionStorage
        const stored = storage.getItem(storageKey(signature))
        const layout =
          stored === null ? undefined : parseWorkspaceLayout(JSON.parse(stored), signature)
        if (layout !== undefined) {
          untrack(() => restore(layout))
        }
      } catch {
        setError('스튜디오 배치를 복원하지 못했습니다.')
      }
    }),
  )
  createEffect(() => {
    if (restoring()) {
      return
    }
    const layout = snapshot()
    if (layout !== undefined) {
      try {
        const storage = props.sessionStorage ?? globalThis.sessionStorage
        storage.setItem(storageKey(layout.signature), JSON.stringify(layout))
      } catch {
        setError('스튜디오 배치를 보관하지 못했습니다.')
      }
    }
  })
  const exportStudio = () => {
    const layout = snapshot()
    const profile = props.controls.profile()
    if (layout === undefined || profile === undefined) {
      return
    }
    const file: StudioFile = {format: 'puppet-studio', layout, profile, version: 1}
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'}),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'puppet-studio.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const importStudio = async (file: File) => {
    if (disposed) {
      return
    }
    importVersion += 1
    const version = importVersion
    const signature = props.controls.profile()?.signature
    const current = () =>
      !disposed &&
      version === importVersion &&
      signature !== undefined &&
      signature === props.controls.profile()?.signature
    setError(null)
    try {
      const text = await file.text()
      if (!current()) {
        return
      }
      const value: unknown = JSON.parse(text)
      const currentProfile = props.controls.profile()
      if (currentProfile === undefined) {
        return
      }
      const result = parseStudioFile({
        currentProfile,
        parseProfile: props.controls.parseProfile,
        value,
      })
      if (result === undefined) {
        throw new Error('현재 모델과 스튜디오 파일이 맞지 않습니다.')
      }
      if (result.layout === undefined) {
        props.controls.updateProfile(result.profile)
      } else {
        restore(result.layout, result.profile)
      }
    } catch (cause) {
      if (current()) {
        setError(cause instanceof Error ? cause.message : '스튜디오를 불러오지 못했습니다.')
      }
    }
  }
  return {dismissError: () => setError(null), error, exportStudio, importStudio}
}
