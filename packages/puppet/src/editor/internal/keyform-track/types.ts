import type {PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter, PuppetParameterBinding} from '../../../player/document'

export interface EditorKeyformTrackProps {
  /** 표시와 메뉴에 사용할 대상 이름. 생략하면 키폼이다. */
  readonly markerLabel?: string
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  /** Deletes a 3D binding's plane at third value `value`. */
  readonly onKeyformPlaneDelete?: (bindingId: string, value: number) => void
  readonly active: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onKeyformMove?: (
    bindingId: string,
    values: PuppetParameterValues,
    nextValues: PuppetParameterValues,
  ) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values?: PuppetParameterValues
}
