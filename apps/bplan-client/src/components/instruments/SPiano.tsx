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

export type SPianoProps = SPianoBodyProps & SPianoRootProps

export const SPiano = (props: SPianoProps) => {
  const [innerProps, restProps] = splitProps(props, ['onDown', 'onUp', 'down'])

  return (
    <SPianoRoot onDown={innerProps.onDown} onUp={innerProps.onUp} down={innerProps.down}>
      <SPianoBody
        {...restProps}
        class={`relative h-486px relative visible min-w-max ${props.class ?? ''}`}
      >
        <SPianoFlatSet class="inline-flex relative w-max h-[calc(100%-10px)]">
          <SPianoFlatKey class="w-80px h-full bg-#f7f7f7" effectClass="from-purple-500" />
        </SPianoFlatSet>
        <SPianoSharpSet
          emptyChildren={<SPianoSharpEmpty class="w-50px mr-30px" />}
          class="flex absolute w-auto h-259px left-55px top-0 left-0"
        >
          <SPianoSharpKey
            class="w-50px h-full bg-black mr-30px flex-shrink-0"
            effectClass="from-indigo-300"
          />
        </SPianoSharpSet>
      </SPianoBody>
    </SPianoRoot>
  )
}
