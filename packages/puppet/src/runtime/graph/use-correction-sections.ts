import {type Accessor, createMemo} from 'solid-js'
import type {RuntimeControls} from '../use-runtime-controls'
interface UseCorrectionSectionsProps {
  readonly controls: RuntimeControls
  readonly parameterId: Accessor<string | undefined>
}
export const useCorrectionSections = (props: UseCorrectionSectionsProps) => {
  const expandedSections = createMemo(() =>
    ['range', 'motion'].filter((section) =>
      props.controls.profile()?.expandedSections?.includes(`${props.parameterId()}:${section}`),
    ),
  )
  const toggleSection = (section: string, open: boolean) => {
    const profile = props.controls.profile()
    const parameterId = props.parameterId()
    if (profile !== undefined && parameterId !== undefined) {
      const key = `${parameterId}:${section}`
      const sections = profile.expandedSections ?? []
      if (sections.includes(key) !== open) {
        props.controls.updateProfile({
          ...profile,
          expandedSections: open ? [...sections, key] : sections.filter((id) => id !== key),
        })
      }
    }
  }
  return {expandedSections, toggleSection}
}
