export const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const

export const ADDED_TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'added',
  source: '/added.mp3',
  title: 'Added',
} as const

export const getAudioElement = (container: HTMLElement): HTMLAudioElement => {
  const audio = container.querySelector('audio')

  if (!(audio instanceof HTMLAudioElement)) {
    throw new TypeError('Expected the Pomo audio element to be rendered')
  }

  return audio
}

export const markAudioMetadataReady = (audio: HTMLAudioElement) => {
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
}
