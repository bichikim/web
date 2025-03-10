import {createSignal, createUniqueId, JSX, onCleanup, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import type {Midi} from '@tonejs/midi'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {loadMidi} from 'src/utils/read-midi'
import {SampleStart} from './types'

export interface HMidiFileInputProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    'accept' | 'type' | 'onTouchEnd'
  > {
  onAdd?: (value: MusicInfo[]) => void
  //
  onTouchEnd?: (event: Event) => void
}

const rootStyle = cx(
  'bg-gray-100 flex items-center justify-center flex-grow-1 rd-1 b-dashed b-.5 b-gray',
  'relative text-4',
)

const labelStyle = cx(
  'inline-flex text-inherit flex justify-center items-center overflow-hidden w-full rd-md',
  'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-black focus-visible:outline-offset--3',
)

export const SMidiFileInput = (props: HMidiFileInputProps) => {
  const id = createUniqueId()
  const [innerProps, restProps] = splitProps(props, ['class', 'onAdd', 'onTouchEnd'])
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | null>(null)
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
        const {header} = midi

        const midiData: SampleStart[][] = midi.tracks
          .map((track) => {
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
          .filter(Boolean) as SampleStart[][]
        let totalDuration = 0

        for (const track of midiData) {
          const lastNote = track.at(-1)

          if (lastNote) {
            const trackTotal = (lastNote.time ?? 0) + (lastNote.duration ?? 0)

            if (trackTotal > totalDuration) {
              totalDuration = trackTotal
            }
          }
        }

        const [singleTrack] = midi.tracks

        if (!singleTrack) {
          return null
        }

        return {
          ext: 'midi',
          header,
          id: `${name}-${index}`,
          midi: midiData.filter(Boolean) as SampleStart[][],
          name: name.replace(/\.mid$/u, ''),
          totalDuration,
        }
      })
      .filter(Boolean) as MusicInfo[]

    innerProps.onAdd?.(samples)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const element = inputElement()

    if (event.key === 'Enter' && element) {
      element.click()
    }
  }

  onCleanup(() => {
    isCleanup = true
  })

  return (
    <div class={cx(rootStyle, innerProps.class)}>
      <label class={labelStyle} for={id} tabIndex="0" onKeyDown={handleKeyDown}>
        <span class="text-nowrap text-6 md:pt-.5 sm:inline-block hidden truncate flex-shrink-1">
          Click or Drop{' '}
        </span>
        <span class="inline-block i-tabler:file-plus text-6 px-1 pt-2 md:h-7 md:w-7 h-9 w-9" />
        <span class="text-nowrap md:inline hidden md:text-6 text-4 md:pt-.5">
          Your files
        </span>
      </label>

      {props.children}
      <input
        {...restProps}
        ref={setInputElement}
        tabIndex="-1"
        title=""
        type="file"
        multiple
        accept="audio/midi"
        aria-label="Midi file input"
        id={id}
        onChange={async (event) => {
          await handleInputFiles(event.target.files)
          ;(event.target.value as any) = null
        }}
        class="block absolute opacity-0 w-100% h-100% cursor-pointer"
      />
    </div>
  )
}
