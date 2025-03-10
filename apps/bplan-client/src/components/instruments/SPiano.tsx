import {
  SPianoBody,
  SPianoBodyProps,
  SPianoFlatKey,
  SPianoFlatSet,
  SPianoRoot,
  SPianoRootProps,
  SPianoSharpKey,
  SPianoSharpSet,
} from 'src/components/instruments/SPianoParts'
import {mergeProps, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'

export type SPianoProps = SPianoBodyProps &
  SPianoRootProps & {
    showKeyName?: boolean
  }

export const pianoSize = 7520

const pianoFlatKeyStyle = cx([
  'w-80px h-full bg-#f7f7f7 flex items-end justify-center c-gray-400 text-4',
  'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-black focus-visible:outline-offset--3',
])

const pianoSharpKeyStyle = cx([
  'w-50px h-full bg-black mr-30px flex flex-shrink-0 justify-center items-end c-gray-300 text-4',
  'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-black focus-visible:outline-offset-2',
])

export const SPiano = (props: SPianoProps) => {
  const defaultProps = mergeProps({velocity: 0.6}, props)

  const [innerProps, bodyProps] = splitProps(defaultProps, [
    'onDown',
    'onUp',
    'down',
    'showKeyName',
    'detune',
    'gainOffset',
    'lpfCutoffHz',
    'velocity',
  ])

  const [rootProps, keyProps] = splitProps(innerProps, [
    'detune',
    'gainOffset',
    'lpfCutoffHz',
    'velocity',
    'down',
    'onDown',
    'onUp',
  ])

  return (
    <SPianoRoot {...rootProps}>
      <SPianoBody
        {...bodyProps}
        class={`relative h-486px relative visible min-w-max ${props.class ?? ''}`}
      >
        <SPianoFlatSet class="inline-flex relative w-max h-[calc(100%-10px)]">
          <SPianoFlatKey
            class={pianoFlatKeyStyle}
            effectClass="from-blue"
            showKeyName={keyProps.showKeyName}
          />
        </SPianoFlatSet>
        <SPianoSharpSet class="flex absolute w-auto h-259px left-55px top-0 left-0">
          <SPianoSharpKey
            class={pianoSharpKeyStyle}
            effectClass="from-blue"
            showKeyName={innerProps.showKeyName}
          />
        </SPianoSharpSet>
      </SPianoBody>
    </SPianoRoot>
  )
}
