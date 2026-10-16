import {parseStudioFile, type StudioFile} from './parse-studio-file'
import {type Accessor, batch, createEffect, createMemo, createSignal, on, untrack} from 'solid-js'
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
  readonly controls: RuntimeControls
  readonly nodes: Accessor<Node[]>
  readonly setNodes: SetStoreFunction<Node[]>
  readonly extraPorts: Accessor<readonly string[]>
  readonly setExtraPorts: (ids: string[]) => void
  readonly hiddenIds: Accessor<readonly string[]>
  readonly restoreHiddenIds: (ids: readonly string[]) => void
}
const storageKey = (signature: string) => `puppet:studio-layout:v1:${signature}`
export const useWorkspaceLayout = (props: UseWorkspaceLayoutProps) => {
  const [restoring, setRestoring] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
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
    setRestoring(true)
    batch(() => {
      props.setExtraPorts([...layout.extraPorts])
      props.restoreHiddenIds(layout.hiddenIds)
      props.controls.updateProfile(applyWorkspaceCollapse(profile, layout))
    })
    // Restore positions after the profile change rebuilds graph membership.
    queueMicrotask(() => {
      props.setNodes(reconcile(applyWorkspacePositions(props.nodes(), layout.positions)))
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
        const stored = sessionStorage.getItem(storageKey(signature))
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
        sessionStorage.setItem(storageKey(layout.signature), JSON.stringify(layout))
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
    const signature = props.controls.profile()?.signature
    try {
      const value: unknown = JSON.parse(await file.text())
      if (signature !== props.controls.profile()?.signature || signature === undefined) {
        return
      }
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
      setError(cause instanceof Error ? cause.message : '스튜디오를 불러오지 못했습니다.')
    }
  }
  return {dismissError: () => setError(null), error, exportStudio, importStudio}
}
