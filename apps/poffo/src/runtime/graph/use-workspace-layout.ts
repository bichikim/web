import type {StudioFile} from './parse-studio-file'
import {useStudioImport} from './use-studio-import'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  createTrackedEffect,
  onCleanup,
  reconcile,
  type StoreSetter,
  untrack,
} from 'solid-js'

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
  readonly setNodes: StoreSetter<Node[]>
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
  const [restoredSignature, setRestoredSignature] = createSignal<string>()
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  let restoreVersion = 0
  onCleanup(() => {
    disposed = true
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
    props.setExtraPorts([...layout.extraPorts])
    props.restoreHiddenIds(layout.hiddenIds)
    props.controls.updateProfile(applyWorkspaceCollapse(profile, layout))
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
  createEffect(signature, (signature) => {
    if (signature === undefined) {
      return setRestoredSignature(undefined)
    }
    props.restoreHiddenIds([])
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
    setRestoredSignature(signature)
  })
  createTrackedEffect(() => {
    if (restoring() || signature() !== restoredSignature()) {
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
  const importStudio = useStudioImport({controls: props.controls, reportError: setError, restore})
  return {dismissError: () => setError(null), error, exportStudio, importStudio}
}
