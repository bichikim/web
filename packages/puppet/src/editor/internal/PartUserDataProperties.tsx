import type {PuppetDocument, PuppetPart} from '../../player'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {CommitTextField} from './CommitTextField'
import {setPartUserData} from './part-user-data'

interface PartUserDataPropertiesProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly part: PuppetPart
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

/** Free text an app reads for the part (Cubism's userdata3). */
export const PartUserDataProperties = (props: PartUserDataPropertiesProps) => (
  <EditorPropertyGroup class="part-properties" title="사용자 데이터">
    <CommitTextField
      disabled={props.disabled}
      label="파트 사용자 데이터"
      placeholder="앱에 전달할 문자열"
      value={props.part.userData ?? ''}
      onCommit={(text) =>
        props.onDocumentChange?.(setPartUserData(props.document, props.part.id, text))
      }
    />
  </EditorPropertyGroup>
)
