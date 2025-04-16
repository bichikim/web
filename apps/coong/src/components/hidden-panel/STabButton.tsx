import {HTabButtonPassArg, Tab} from 'src/components/tab'
import {SButton, SButtonProps} from 'src/components/button'
import {splitProps} from 'solid-js'
import {cva} from 'class-variance-authority'

export interface STabButtonProps extends SButtonProps {
  value: string
}

const rootStyle = cva('', {
  variants: {
    isSelected: {
      false: '',
      true: 'bg-white',
    },
  },
})

export const STabButton = (props: STabButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['value'])

  return (
    <Tab.Button value={innerProps.value}>
      {(arg: HTabButtonPassArg) => (
        <SButton
          {...restProps}
          {...arg}
          variant={arg.isSelected ? 'default' : restProps.variant}
          class={rootStyle({class: restProps.class, isSelected: arg.isSelected})}
        >
          {restProps.children}
        </SButton>
      )}
    </Tab.Button>
  )
}
