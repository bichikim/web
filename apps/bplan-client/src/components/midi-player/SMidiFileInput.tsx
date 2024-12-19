import {JSX, onCleanup, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {Midi} from '@tonejs/midi/src/Midi'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {loadMidi} from 'src/utils/read-midi'
import {SampleStart} from './types'

export interface HMidiFileInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'accept' | 'type'> {
  //
  onAdd?: (value: MusicInfo[]) => void
}

export const SMidiFileInput = (props: HMidiFileInputProps) => {
  const [containerProps, inputProps] = splitProps(props, ['class'])
  let isCleanup = false

  const handleInputFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    const promiseList: Promise<{midi: Midi; name: string}>[] = []
    // FileList 는 이터레이블이 아닙니다
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      promiseList.push(loadMidi(file))
    }

    const midis = await Promise.all(promiseList)

    if (isCleanup) {
      return
    }

    const samples: MusicInfo[] = midis
      .map((midiFile, index): MusicInfo | null => {
        const {name, midi} = midiFile
        const midiData: (SampleStart[] | null)[] = midi.tracks.map((track) => {
          const {notes, instrument: {family} = {}} = track
          if (!notes || family !== 'piano') {
            return null
          }
          return notes.map((track): SampleStart => {
            return {
              duration: track.duration,
              note: track.name,
              time: track.time,
              velocity: track.velocity,
            }
          })
        })
        const [singleTrack] = midi.tracks
        if (!singleTrack) {
          return null
        }

        return {
          ext: 'midi',
          id: `${name}-${index}`,
          midi: midiData.filter(Boolean) as SampleStart[][],
          name: name.replace(/\.mid$/u, ''),
        }
      })
      .filter(Boolean) as MusicInfo[]

    props.onAdd?.(samples)
  }

  onCleanup(() => {
    isCleanup = true
  })

  return (
    <div
      class={cx(
        'bg-gray-100 flex items-center justify-center flex-grow-1 rd-6px cursor-pointer b-dashed b-2px b-gray',
        'relative',
        containerProps.class,
      )}
    >
      <span class="">Click or Drop </span>
      <span class="block i-hugeicons:file-add text-28px px-1" />
      <span>Your files</span>
      {props.children}
      <input
        {...inputProps}
        type="file"
        multiple
        accept="audio/midi"
        onChange={(event) => handleInputFiles(event.target.files)}
        class="block absolute opacity-0 cursor-pointer w-full h-full"
      />
    </div>
  )
}
