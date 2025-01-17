import {
  SPianoBody,
  SPianoBodyProps,
  SPianoFlatKey,
  SPianoFlatSet,
  SPianoRoot,
  SPianoRootProps,
  SPianoSharpEmpty,
  SPianoSharpKey,
  SPianoSharpSet,
} from 'src/components/instruments/SPianoParts'
import {splitProps} from 'solid-js'

export type SPianoProps = SPianoBodyProps &
  SPianoRootProps & {
    showKeyName?: boolean
  }

export const SPiano = (props: SPianoProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'onDown',
    'onUp',
    'down',
    'showKeyName',
  ])

  return (
    <SPianoRoot onDown={innerProps.onDown} onUp={innerProps.onUp} down={innerProps.down}>
      <SPianoBody
        {...restProps}
        class={`relative h-486px relative visible min-w-max ${props.class ?? ''}`}
      >
        <SPianoFlatSet class="inline-flex relative w-max h-[calc(100%-10px)]">
          <SPianoFlatKey
            class="w-80px h-full bg-#f7f7f7 flex items-end justify-center c-gray-400 text-4"
            effectClass="from-purple-500"
            showKeyName={innerProps.showKeyName}
          />
        </SPianoFlatSet>
        <SPianoSharpSet
          emptyChildren={<SPianoSharpEmpty class="w-50px mr-30px" />}
          class="flex absolute w-auto h-259px left-55px top-0 left-0"
        >
          <SPianoSharpKey
            class="w-50px h-full bg-black mr-30px flex flex-shrink-0 justify-center items-end c-gray-300 text-4"
            effectClass="from-indigo-300"
            showKeyName={innerProps.showKeyName}
          />
        </SPianoSharpSet>
      </SPianoBody>
    </SPianoRoot>
  )
}
