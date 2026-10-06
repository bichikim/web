import {createSignal, onMount} from 'solid-js'
import {TrackPanel} from '../../../../../src/components/admin-music/workspace/TrackPanel'
import {type AdminTrack, useAdminMusic} from '../../../../../src/features/admin-music'

const TRACK_ID = '11111111-1111-4111-8111-111111111111'

export default function Tracks() {
  const model = useAdminMusic()
  const [tracks, setTracks] = createSignal<ReadonlyArray<AdminTrack>>([
    {albumId: 'album', artist: 'Artist', id: TRACK_ID, position: 1, title: 'Original track'},
  ])
  onMount(() => {
    document.documentElement.dataset.hydrated = 'true'
  })
  return (
    <main>
      <button
        onClick={() =>
          setTracks((current) => current.map((track) => ({...track, title: 'Updated track'})))
        }
        type="button"
      >
        Refresh tracks
      </button>
      <button onClick={() => setTracks([])} type="button">
        Remove tracks
      </button>
      <TrackPanel
        albumId="album"
        albumTitle="Album"
        albumStatus="draft"
        model={model}
        assets={[{id: 'asset', status: 'active', trackId: TRACK_ID}]}
        pendingTracks={[]}
        tracks={tracks()}
      />
    </main>
  )
}
