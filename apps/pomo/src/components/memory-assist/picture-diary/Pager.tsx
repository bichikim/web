import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {type PictureDiaryTurnDirection} from './use-page-turn'

interface PictureDiaryPagerProps {
  readonly frontCoverClosed?: boolean
  readonly backCoverClosed?: boolean
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly disabled?: boolean
  readonly onTurn: (direction: PictureDiaryTurnDirection) => void
}

export const PictureDiaryPager = (props: PictureDiaryPagerProps) => (
  <div class="picture-diary-book__pager" hidden={props.disabled}>
    <Show when={!props.backCoverClosed}>
      <button
        aria-label={m.picture_diary_previous_entry()}
        class="picture-diary-book__turn picture-diary-book__turn--older"
        disabled={!props.canGoOlder || props.disabled}
        onClick={() => props.onTurn('older')}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
      </button>
    </Show>
    <Show when={!props.frontCoverClosed}>
      <button
        aria-label={m.picture_diary_next_entry()}
        class="picture-diary-book__turn picture-diary-book__turn--newer"
        disabled={!props.canGoNewer || props.disabled}
        onClick={() => props.onTurn('newer')}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-chevron-right size-4" />
      </button>
    </Show>
  </div>
)
