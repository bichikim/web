import {Show} from 'solid-js'

interface PictureDiaryStatusProps {
  readonly message: string | null
}

export const PictureDiaryStatus = (props: PictureDiaryStatusProps) => (
  <Show when={props.message}>
    {(message) => (
      <p aria-live="polite" class="m-0 text-sm text-muted-foreground" role="status">
        {message()}
      </p>
    )}
  </Show>
)
