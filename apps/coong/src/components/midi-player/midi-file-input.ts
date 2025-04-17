import {createMemo, createSignal, onCleanup} from 'solid-js'
import {MaybeAccessor, resolveAccessor, useEvent} from '@winter-love/solid-use'
import {loadMidi} from 'src/utils/read-midi'
import {getWindow, isNotNull, ONE_MB, TEN} from '@winter-love/utils'
import type {Midi} from '@tonejs/midi'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {SampleStart} from './types'

const DEFAULT_MAX_FILE_SIZE = TEN * ONE_MB

export interface MidiFileInputOptions {
  maxFileSize?: number
  onAdd?: (value: MusicInfo[]) => void
  onClick?: (event: PointerEvent) => void
}

export const useMidiFileInput = (
  element: MaybeAccessor<HTMLElement | null>,
  options: MidiFileInputOptions = {},
) => {
  const inputElement = resolveAccessor(element)
  const [isFocused, setIsFocused] = createSignal(false)
  const [isTouchStart, setIsTouchStart] = createSignal(false)
  const [isDragOver, setIsDragOver] = createSignal(false)

  let isCleanup = false
  // let isTouchStart = false

  const handleInputFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    const promiseList: Promise<{midi: Midi; name: string} | undefined>[] = []

    // FileList 는 이터레이블이 아닙니다
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]

      promiseList.push(loadMidi(file, options.maxFileSize))
    }

    const midis = await Promise.all(promiseList)

    if (isCleanup) {
      return
    }

    const samples: MusicInfo[] = midis
      .map((midiFile, index): MusicInfo | null => {
        if (!midiFile) {
          return null
        }

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
      .filter(isNotNull)

    options.onAdd?.(samples)
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

  const handleInputClick: (event: any) => void = (event: PointerEvent) => {
    options.onClick?.(event)

    // 터치 끝날 시 클릭 방지 터치가 시작된후 바로 그 시작된 엘리먼트 자리에 다른 엘리먼트가 있을 경우 클릭 방지
    if (!isTouchStart() && event.pointerType === 'touch') {
      event.preventDefault()
    }

    setIsTouchStart(false)
  }

  const handleTouchStart = () => {
    setIsTouchStart(true)
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

  return {
    handleBlur,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFocus,
    handleInputClick,
    handleInputFiles,
    handleTouchStart,
    isDragOver,
    isFocused,
  }
}
