import {createSignal, createUniqueId, JSX, splitProps} from 'solid-js'
import {cva} from 'class-variance-authority'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {useMidiFileInput} from './midi-file-input'

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
inline-flex text-inherit flex justify-center items-center overflow-hidden w-full rd-md cursor-pointer @container
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

  // let isTouchStart = false

  const {
    isDragOver,
    isFocused,
    handleInputFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFocus,
    handleBlur,
    handleInputClick,
    handleTouchStart,
  } = useMidiFileInput(inputElement, {
    onAdd: props.onAdd,
    onClick: props.onClick,
  })

  return (
    <div
      class={rootStyle({
        class: innerProps.class,
        isDragOver: isDragOver(),
        isFocused: isFocused(),
      })}
    >
      <label class={labelStyle} tabIndex="-1" onDragOver={handleDragOver} for={id}>
        <span class=":uno: text-5 @[15rem]:pt-.5 @[9rem]:inline-block @[14rem]:text-6 hidden truncate flex-shrink-1">
          Click or Drop{' '}
        </span>
        <span class=":uno: inline-block i-tabler:file-plus text-6 px-1 pt-2 @[14rem]:h-7 @[14rem]:w-7 h-9 w-9" />
        <span class=":uno: @[17rem]:inline hidden text-6 @[15rem]:pt-.5">Your files</span>
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
