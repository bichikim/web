import {
  createMemo,
  createSignal,
  createUniqueId,
  JSX,
  onCleanup,
  splitProps,
} from 'solid-js'
import {cva} from 'class-variance-authority'
import type {Midi} from '@tonejs/midi'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {loadMidi} from 'src/utils/read-midi'
import {SampleStart} from './types'
import {useEvent} from '@winter-love/solid-use'
import {getWindow} from '@winter-love/utils'

export interface HMidiFileInputProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    'accept' | 'type' | 'onTouchEnd' | 'onClick'
  > {
  onAdd?: (value: MusicInfo[]) => void
  onClick?: (event: PointerEvent) => void
  //
  onTouchEnd?: (event: Event) => void
}

const rootBaseStyle = `:uno:
bg-gray-100 flex items-center justify-center flex-grow-1 rd-1 b-dashed b-gray
relative text-4
`

const labelStyle = `:uno:
inline-flex text-inherit flex justify-center items-center overflow-hidden w-full rd-md cursor-pointer
`

const rootStyle = cva(rootBaseStyle, {
  variants: {
    isDragOver: {
      false: 'b-.5',
      true: 'b-2',
    },
    isFocused: {
      false: '',
      true: 'outline-3 outline-solid outline-black outline-offset--3',
    },
  },
})

export const SMidiFileInput = (props: HMidiFileInputProps) => {
  const id = createUniqueId()

  const [innerProps, restProps] = splitProps(props, [
    'class',
    'onAdd',
    'onTouchEnd',
    'onClick',
  ])
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | null>(null)
  const [isFocused, setIsFocused] = createSignal(false)
  const [isTouchStart, setIsTouchStart] = createSignal(false)
  const [isDragOver, setIsDragOver] = createSignal(false)
  let isCleanup = false
  // let isTouchStart = false

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

  const globalTarget = createMemo(() => (isTouchStart() ? getWindow() : null))

  useEvent(globalTarget, 'touchend', () => {
    if (isTouchStart()) {
      inputElement()?.click()
    }

    setIsTouchStart(false)
  })

  onCleanup(() => {
    isCleanup = true
  })

  const handleTouchStart = () => {
    setIsTouchStart(true)
  }

  const handleInputClick: (event: any) => void = (event: PointerEvent) => {
    props.onClick?.(event)

    // 터치 끝날 시 클릭 방지 터치가 시작된후 바로 그 시작된 엘리먼트 자리에 다른 엘리먼트가 있을 경우 클릭 방지
    if (!isTouchStart() && event.pointerType === 'touch') {
      event.preventDefault()
    }

    setIsTouchStart(false)
  }

  const handleDragOver = () => {
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = () => {
    setIsDragOver(false)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <div
      class={rootStyle({
        class: innerProps.class,
        isDragOver: isDragOver(),
        isFocused: isFocused(),
      })}
    >
      <label
        class={labelStyle}
        tabIndex="-1"
        onDragOver={handleDragOver}
        aria-controls={id}
      >
        <span class=":uno: text-6 md:pt-.5 sm:inline-block hidden truncate flex-shrink-1">
          Click or Drop{' '}
        </span>
        <span class=":uno: inline-block i-tabler:file-plus text-6 px-1 pt-2 md:h-7 md:w-7 h-9 w-9" />
        <span class=":uno: md:inline hidden md:text-6 text-4 md:pt-.5">Your files</span>
      </label>

      {props.children}
      <input
        {...restProps}
        onClick={handleInputClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        ref={setInputElement}
        tabIndex="0"
        title=""
        type="file"
        id={id}
        multiple
        accept="audio/midi"
        aria-label="Midi file input"
        onChange={async (event) => {
          await handleInputFiles(event.target.files)
          ;(event.target.value as any) = null
        }}
        class=":uno: block absolute opacity-0 w-100% h-100%"
      />
    </div>
  )
}
