import {DesktopPlayer} from 'src/components/desktop-surface/Player'
import {createDesktopMusicActionInbox} from 'src/features/desktop-mode'
import {onCleanup} from 'solid-js'

export default function DesktopPlayerPage() {
  const musicActionInbox = createDesktopMusicActionInbox()
  onCleanup(() => musicActionInbox.close())

  return <DesktopPlayer musicActionInbox={musicActionInbox} />
}
