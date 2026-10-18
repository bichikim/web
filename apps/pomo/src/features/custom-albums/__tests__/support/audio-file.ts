export const createCustomAlbumAudioFile = (size: number, name = 'song.mp3'): File =>
  new File([new Uint8Array(size)], name, {type: 'audio/mpeg'})
