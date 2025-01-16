import {HFrameContent} from 'src/components/iframe/HFrame'
import {RouteSectionProps} from '@solidjs/router'
import {createMemo} from 'solid-js'
import {Process} from './_components/Process'

export interface SubProcessPageProps extends RouteSectionProps {
  params: {
    id: string
  }
}
/**
 * sub process page 는 다른 페이지에서 iframe 으로 호출되는 페이지이다.
 */
export default function SubProcessPage(props: SubProcessPageProps) {
  const params = createMemo(() => props.params)
  const id = createMemo(() => params().id)

  return (
    <HFrameContent id={id()}>
      <div>
        <Process />
      </div>
    </HFrameContent>
  )
}
