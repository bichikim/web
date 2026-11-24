import {type Accessor, createMemo, createSignal, onCleanup} from 'solid-js'
import type {SettingsBranch, SettingsBreadcrumb} from './types'
import {useSettingsTransition} from './use-settings-transition'

export const useSettingsNavigation = (
  segment: Accessor<SettingsBreadcrumb>,
  resetContent?: () => void,
): SettingsBranch => {
  const [branches, setBranches] = createSignal<readonly SettingsBranch[]>([])
  const [requested, setRequested] = createSignal<readonly SettingsBreadcrumb[] | null>(null)
  const transition = useSettingsTransition()
  let revision = 0
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const path = createMemo(() => [segment()])
  const attach = (branch: SettingsBranch) => {
    setBranches((previous) => [...previous, branch])
    return () => setBranches((previous) => previous.filter((item) => item !== branch))
  }
  const settled = createMemo(() =>
    branches()
      .filter((branch) => branch.active())
      .map((branch) => branch.path())
      .reduce((current, next) => (next.length > current.length ? next : current), path()),
  )
  const trail = createMemo(() => requested() ?? settled())
  const pending = createMemo(() => requested() !== null)
  const navigate = (next: readonly SettingsBreadcrumb[], change: () => void): Promise<void> => {
    revision += 1
    const request = revision
    setRequested(next)
    return transition
      .start(() => {
        if (!disposed && request === revision) {
          resetContent?.()
          change()
        }
      })
      .finally(() => {
        if (!disposed && request === revision) {
          setRequested(null)
        }
      })
  }
  const select = (segment: SettingsBreadcrumb, value: string) => {
    const current = trail()
    const index = current.findIndex((item) => item.label === segment.label)
    const prefix = index < 0 ? path() : current.slice(0, index)
    return navigate([...prefix, {...segment, value}], () => segment.onSelect?.(value))
  }
  return {active: () => true, attach, navigate, path, pending, select, trail}
}
