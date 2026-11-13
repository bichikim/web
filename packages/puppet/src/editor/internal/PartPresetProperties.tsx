import type {PuppetDocument} from '../../player'
import type {PartPresetPropertiesProps} from './part-presets/types'
import {PartHitAreaSection} from './part-presets/PartHitAreaSection'
import {PartPoseSection} from './part-presets/PartPoseSection'

/** Hit area and pose group membership of the selected part. */
export const PartPresetProperties = (props: PartPresetPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const apply = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
    return document !== undefined
  }
  return (
    <>
      <PartHitAreaSection {...props} apply={apply} disabled={disabled()} />
      <PartPoseSection {...props} apply={apply} disabled={disabled()} />
    </>
  )
}

export type {PartPresetPropertiesProps} from './part-presets/types'
