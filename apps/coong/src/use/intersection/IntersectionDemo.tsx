import {createSignal} from 'solid-js'
import {useIntersection} from './index'

export const IntersectionDemo = (props: {rootMargin?: string; threshold?: number}) => {
  const [target, setTarget] = createSignal<HTMLDivElement>()

  const isIntersecting = useIntersection(target, {
    rootMargin: props.rootMargin || '0px',
    threshold: props.threshold || 0.5,
  })

  return (
    <div class="h-96 overflow-auto border border-gray-300 p-4">
      <div class="h-32 bg-blue-100 p-4 mb-4">
        <p>Scroll down to see the intersection demo</p>
      </div>
      <div class="h-32 bg-blue-100 p-4 mb-4">
        <p>More content to scroll through</p>
      </div>
      <div
        ref={setTarget}
        class={`h-32 p-4 transition-colors duration-300 ${isIntersecting() ? 'bg-green-200' : 'bg-red-200'}`}
      >
        <p>This element is {isIntersecting() ? 'intersecting' : 'not intersecting'} with the viewport</p>
        <p class="text-sm text-gray-600">
          Threshold: {props.threshold || 0.5} | Root Margin: {props.rootMargin || '0px'}
        </p>
      </div>
      <div class="h-32 bg-blue-100 p-4 mb-4">
        <p>More content below</p>
      </div>
      <div class="h-32 bg-blue-100 p-4">
        <p>End of scrollable content</p>
      </div>
    </div>
  )
}
