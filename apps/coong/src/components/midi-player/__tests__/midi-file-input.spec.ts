/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {Midi} from '@winter-love/tonejs-midi'
import {afterEach, expect, it, vi} from 'vitest'
import {loadMidi} from 'src/utils/midi-reader'
import type {MusicInfo} from '../SFileItem'
import {type MidiFileInputOptions, useMidiFileInput} from '../midi-file-input'

interface NoteInput {
  name: string
  time: number
  duration: number
}
interface TrackInput {
  notes: NoteInput[]
  program?: number
}
const createFile = (name: string, bytes: Uint8Array<ArrayBuffer>) => {
  const file = new File([bytes], name, {type: 'audio/midi'})
  // jsdom File에는 arrayBuffer가 없어 같은 실제 바이트를 읽는 Response 경계만 연결한다.
  Object.defineProperty(file, 'arrayBuffer', {value: () => new Response(bytes).arrayBuffer()})
  return file
}
const createMidiFile = (name: string, tracks: TrackInput[]) => {
  const midi = new Midi()
  for (const input of tracks) {
    const track = midi.addTrack()
    track.instrument.number = input.program ?? 0
    input.notes.forEach((note) => track.addNote({...note, velocity: 0.75}))
  }
  return createFile(name, Uint8Array.from(midi.toArray()))
}
const fileList = (...files: File[]): FileList =>
  Object.assign(files, {item: (index: number) => files[index] ?? null})
const singleNoteFile = (name: string, note: string) =>
  createMidiFile(name, [{notes: [{duration: 1, name: note, time: 0}]}])
const mountInput = (options: MidiFileInputOptions) => {
  let input!: ReturnType<typeof useMidiFileInput>
  const view = render(() => {
    input = useMidiFileInput(null, options)
    return null
  })
  return {input, unmount: view.unmount}
}
const pitches = (music: MusicInfo) => music.midi?.flat().map((note) => note.note)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['same-input', 'other-input', 'remount'] as const)(
  'should preserve saved identities and append unique new identities across %s batches',
  async (boundary) => {
    const saved = {id: 'same.mid-0', name: 'previous', totalDuration: 1}
    const songs: MusicInfo[] = [saved]
    const onAdd = (items: MusicInfo[]) => songs.push(...items)
    const first = mountInput({onAdd})
    await first.input.handleInputFiles(fileList(singleNoteFile('same.mid', 'C4')))
    const firstId = songs[1].id
    if (boundary === 'remount') {
      first.unmount()
    }
    const next = boundary === 'same-input' ? first : mountInput({onAdd})
    await next.input.handleInputFiles(fileList(singleNoteFile('same.mid', 'G4')))
    expect(new Set(songs.map((song) => song.id)).size).toBe(3)
    expect(songs[0]).toBe(saved)
    expect(songs[1].id).toBe(firstId)
    expect(songs.slice(1).map(pitches)).toEqual([['C4'], ['G4']])
  },
)

it('should retain every concurrent import and reimport without merging identical files', async () => {
  const songs: MusicInfo[] = []
  const {input} = mountInput({onAdd: (items) => songs.push(...items)})
  const file = singleNoteFile('same.mid', 'C4')
  await Promise.all([
    input.handleInputFiles(fileList(file)),
    input.handleInputFiles(fileList(file)),
  ])
  await input.handleInputFiles(fileList(file))
  expect(new Set(songs.map((song) => song.id)).size).toBe(3)
  expect(songs.map(pitches)).toEqual([['C4'], ['C4'], ['C4']])
})

it('should skip empty input and invalid files while preserving accepted order', async () => {
  const onAdd = vi.fn()
  const {input} = mountInput({maxFileSize: 1024, onAdd})
  await input.handleInputFiles(null)
  await input.handleInputFiles(fileList())
  expect(onAdd).not.toHaveBeenCalled()
  const invalid = createFile('invalid.mid', new Uint8Array([1, 2, 3]))
  const oversized = createFile('large.mid', new Uint8Array(1025))
  await input.handleInputFiles(
    fileList(
      singleNoteFile('first.mid', 'C4'),
      invalid,
      singleNoteFile('second.mid', 'G4'),
      oversized,
    ),
  )
  expect(onAdd).toHaveBeenCalledOnce()
  const songs: MusicInfo[] = onAdd.mock.calls[0][0]
  expect(songs.map((song) => song.name)).toEqual(['first', 'second'])
  expect(songs.map(pitches)).toEqual([['C4'], ['G4']])
  await input.handleInputFiles(fileList(invalid))
  expect(onAdd).toHaveBeenLastCalledWith([])
})

it('should use every piano note end while excluding longer nonpiano tracks and tolerating empty tracks', async () => {
  const onAdd = vi.fn()
  const {input} = mountInput({onAdd})
  const file = createMidiFile('overlap.mid', [
    {
      notes: [
        {duration: 10, name: 'C4', time: 0},
        {duration: 1, name: 'D4', time: 2},
      ],
    },
    {notes: [{duration: 3, name: 'C5', time: 4}]},
    {notes: []},
    {notes: [{duration: 30, name: 'C6', time: 0}], program: 40},
  ])
  const parsed = await loadMidi(file)
  expect(parsed?.midi.duration).toBe(30)
  await input.handleInputFiles(fileList(file))
  const [song]: MusicInfo[] = onAdd.mock.calls[0][0]
  expect(song.totalDuration).toBe(10)
  expect(pitches(song)).toEqual(['C4', 'D4', 'C5'])
  expect(song.header).toBeDefined()
})

it('should preserve the existing zero-duration import for files without piano notes', async () => {
  const onAdd = vi.fn()
  const {input} = mountInput({onAdd})
  await input.handleInputFiles(
    fileList(
      createMidiFile('strings.mid', [{notes: [{duration: 30, name: 'C6', time: 0}], program: 40}]),
    ),
  )
  expect(onAdd.mock.calls[0][0]).toMatchObject([
    {ext: 'midi', midi: [], name: 'strings', totalDuration: 0},
  ])
})

it('should not publish a parsed import or allocate identity after the owner unmounts', async () => {
  const onAdd = vi.fn()
  const createId = vi.spyOn(globalThis.crypto, 'getRandomValues')
  const {input, unmount} = mountInput({onAdd})
  const pending = input.handleInputFiles(fileList(singleNoteFile('late.mid', 'C4')))
  unmount()
  await pending
  expect(onAdd).not.toHaveBeenCalled()
  expect(createId).not.toHaveBeenCalled()
})

it('should import through getRandomValues when randomUUID is unavailable', async () => {
  const crypto = globalThis.crypto
  vi.stubGlobal('crypto', {getRandomValues: crypto.getRandomValues.bind(crypto)})
  const songs: MusicInfo[] = []
  const {input} = mountInput({onAdd: (items) => songs.push(...items)})
  const file = singleNoteFile('same.mid', 'C4')
  await input.handleInputFiles(fileList(file))
  await input.handleInputFiles(fileList(file))
  expect(songs.map(pitches)).toEqual([['C4'], ['C4']])
  expect(songs.every((song) => song.id.length > 0)).toBe(true)
  expect(new Set(songs.map((song) => song.id)).size).toBe(2)
})
