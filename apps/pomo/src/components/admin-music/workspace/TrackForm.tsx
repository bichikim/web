import {BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES} from '../button-classes'
import {TrackFields} from '../TrackFields'
import {type AlbumTaskFormProps} from './form-props'

interface TrackFormProps extends AlbumTaskFormProps {
  readonly onCancel: () => void
}

export const TrackForm = (props: TrackFormProps) => (
  <form
    class="rounded-4 border border-#e8bc88/25 bg-#e8bc88/5 p-5 sm:p-6"
    onSubmit={(event) => props.model.handleTrackSubmit(event)}
  >
    <h3 class="m-0 text-base font-800">새 곡 추가</h3>
    <p class="mb-0 mt-2 text-xs leading-5 text-white/45">
      MP3 하나가 ‘{props.albumTitle}’의 수록곡 하나로 등록됩니다.
    </p>
    <input name="albumId" type="hidden" value={props.albumId} />
    <div class="mt-5">
      <TrackFields
        artist={props.model.trackArtist()}
        onArtistChange={props.model.setTrackArtist}
        onTitleChange={props.model.setTrackTitle}
        resetVersion={props.model.trackResetVersion()}
        title={props.model.trackTitle()}
      />
    </div>
    <div class="mt-5 flex flex-wrap justify-end gap-2">
      <button class={SECONDARY_BUTTON_CLASSES} onClick={() => props.onCancel()} type="button">
        닫기
      </button>
      <button class={BUTTON_CLASSES} disabled={props.model.isSavingTrack()} type="submit">
        {props.model.isSavingTrack() ? '곡 저장·MP3 검증 중…' : '곡 추가'}
      </button>
    </div>
  </form>
)
