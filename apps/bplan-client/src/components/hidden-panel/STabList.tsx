import {Tab} from 'src/components/tab'
import {SHiddenPanelContext} from './SHiddenPanelProvider'
import {ComponentProps, useContext} from 'solid-js'
import {cva} from 'class-variance-authority'

export interface STabListProps extends ComponentProps<'div'> {
  //
}

const rootStyle = cva('absolute top-1 left--8 flex flex-col gap-2 items-center', {
  variants: {
    isOpen: {
      false: 'hidden',
      true: '',
    },
  },
})

export const STabList = (props: STabListProps) => {
  const {isOpen, setIsOpen} = useContext(SHiddenPanelContext)

  return (
    <Tab.List {...props} class={rootStyle({class: props.class, isOpen: isOpen()})}>
      {props.children}
    </Tab.List>
  )
}
