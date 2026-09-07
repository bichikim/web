import * as m from '@paraglide/message'

export const LoadingStatus = () => (
  <div
    aria-live="polite"
    class="grid min-h-32 place-items-center text-sm text-muted-foreground"
    role="status"
  >
    {m.album_loading()}
  </div>
)
