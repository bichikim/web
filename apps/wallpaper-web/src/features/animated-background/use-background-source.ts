import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'

interface UseBackgroundSourceProps {
  readonly host: Accessor<HTMLElement | null>
  readonly landscape: Accessor<string>
  readonly portrait: Accessor<string>
  readonly tall?: Accessor<string>
}

export const useBackgroundSource = (props: UseBackgroundSourceProps): Accessor<string | null> => {
  const [layout, setLayout] = createSignal<'landscape' | 'portrait' | 'tall' | null>(null)
  createEffect(() => {
    const host = props.host()
    if (host === null) {
      return
    }
    const measure = () => {
      const height = host.clientHeight
      const width = host.clientWidth
      if (width <= 0 || height <= 0) {
        setLayout(null)
        return
      }
      setLayout(height / width > 2 ? 'tall' : height > width ? 'portrait' : 'landscape')
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    onCleanup(() => observer.disconnect())
  })
  return createMemo(() => {
    const current = layout()
    if (current === null) {
      return null
    }
    switch (current) {
      case 'landscape':
        return props.landscape()
      case 'portrait':
        return props.portrait()
      case 'tall':
        return props.tall?.() ?? props.portrait()
    }
  })
}
