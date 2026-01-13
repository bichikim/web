import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {
  type Component,
  type ComponentProps,
  createMemo,
  createSignal,
  For,
  mergeProps,
  onMount,
  splitProps,
} from 'solid-js'
import {cva} from 'class-variance-authority'
import {DelegatedEventProvider} from 'src/use/focus-controller/DelegatedEvent'
import {KeyCap} from 'src/use/focus-controller/KeyCap'
import {FocusControllerProvider, FocusGroupWithElement, useFocus, useFocusControllerContext} from '../focus'
import type {Direction, PreventMoveOptions} from 'src/utils/space-focus/focus-store'

const focusTileStyles = cva(
  `:uno: h-80px w-80px flex flex-col items-center justify-center rounded-lg
  border-2 text-sm font-semibold transition-colors duration-200`,
  {
    defaultVariants: {
      focused: false,
      inactive: false,
    },
    variants: {
      focused: {
        false: 'border-gray-300 bg-white text-gray-600',
        true: 'border-blue-500 bg-blue-50 text-blue-600 shadow-focus',
      },
      inactive: {
        false: '',
        true: 'opacity-40 cursor-not-allowed',
      },
    },
  },
)

const TILE_IDS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5', 'tile-6'] as const

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
}

/** Configuration for each interactive focus tile. */
export interface FocusTileProps extends ComponentProps<'button'> {
  id: string
  inactive?: boolean
  label: string
  preventMove?: PreventMoveOptions
}

const FocusTile: Component<FocusTileProps> = (props) => {
  const propsWithDefaults = mergeProps({inactive: false}, props)
  const [innerProps, restProps] = splitProps(propsWithDefaults, ['inactive', 'label', 'preventMove'])
  const [element, setElement] = createSignal<HTMLElement | null>(null)

  const [isFocused, setFocused] = useFocus(element, () => ({
    isInactive: innerProps.inactive,
    preventMove: innerProps.preventMove,
  }))

  return (
    <button
      ref={setElement}
      class={focusTileStyles({
        focused: isFocused(),
        inactive: innerProps.inactive,
      })}
      disabled={innerProps.inactive}
      onClick={() => setFocused(true)}
      {...restProps}
    >
      <span>{innerProps.label}</span>
      <span class="text-xs font-normal">{isFocused() ? 'focused' : ' '}</span>
    </button>
  )
}

/** Args exposed to Storybook for the focus playground demo. */
export interface FocusPlaygroundProps {
  inactiveTiles?: Array<(typeof TILE_IDS)[number]>
  lockVertical?: boolean
}

const FocusPlaygroundBody: Component<FocusPlaygroundProps> = (props) => {
  const propsWithDefaults = mergeProps(
    {inactiveTiles: [] as Array<(typeof TILE_IDS)[number]>, lockVertical: false},
    props,
  )
  const [innerProps] = splitProps(propsWithDefaults, ['inactiveTiles', 'lockVertical'])
  const focusController = useFocusControllerContext()
  const [activeDirection, setActiveDirection] = createSignal<Direction | null>(null)
  const [focusZone, setFocusZone] = createSignal<HTMLDivElement | null>(null)

  const preventMove = createMemo<PreventMoveOptions | undefined>(() => {
    if (!innerProps.lockVertical) {
      return
    }

    return {
      bottom: true,
      top: true,
    }
  })

  const getDirectionFromKey = (key: string): Direction | null => {
    return KEY_TO_DIRECTION[key] ?? null
  }

  const handleDirection = (direction: Direction, options: {transient?: boolean} = {}) => {
    focusController?.moveFocus(direction)
    setActiveDirection(direction)

    if (options.transient) {
      queueMicrotask(() => {
        setActiveDirection((prev) => (prev === direction ? null : prev))
      })
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const direction = getDirectionFromKey(event.key)

    if (!direction) {
      return
    }

    event.preventDefault()
    handleDirection(direction)
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    const direction = getDirectionFromKey(event.key)

    if (!direction) {
      return
    }

    if (activeDirection() === direction) {
      setActiveDirection(null)
    }
  }

  onMount(() => {
    focusZone()?.focus()
  })

  return (
    <div
      ref={setFocusZone}
      class=":uno: flex flex-col gap-16px p-16px outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <div class="grid grid-cols-3 gap-16px">
        <For each={TILE_IDS}>
          {(tileId, index) => (
            <FocusTile
              id={tileId}
              label={`Tile ${index() + 1}`}
              inactive={innerProps.inactiveTiles.includes(tileId)}
              preventMove={tileId === 'tile-5' ? preventMove() : undefined}
            />
          )}
        </For>
      </div>
      <div class=":uno: flex flex-col gap-8px">
        <p class="text-sm text-gray-500">
          Click any tile or use the arrow keys below to move the shared focus. The center tile can optionally block
          vertical moves via the args.
        </p>
        <div class=":uno: flex flex-col gap-8px self-center">
          <div class="flex justify-center">
            <KeyCap
              childClassName="i-tabler:caret-up-filled"
              pressed={activeDirection() === 'up'}
              onClick={() => handleDirection('up', {transient: true})}
            />
          </div>
          <div class="flex gap-8px justify-center">
            <KeyCap
              childClassName="i-tabler:caret-left-filled"
              pressed={activeDirection() === 'left'}
              onClick={() => handleDirection('left', {transient: true})}
            />
            <KeyCap
              childClassName="i-tabler:caret-down-filled"
              pressed={activeDirection() === 'down'}
              onClick={() => handleDirection('down', {transient: true})}
            />
            <KeyCap
              childClassName="i-tabler:caret-right-filled"
              pressed={activeDirection() === 'right'}
              onClick={() => handleDirection('right', {transient: true})}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const FocusPlaygroundContainer = (props: FocusPlaygroundProps) => {
  return (
    <DelegatedEventProvider>
      <FocusControllerProvider>
        <FocusGroupWithElement>
          <FocusPlaygroundBody {...props} />
        </FocusGroupWithElement>
      </FocusControllerProvider>
    </DelegatedEventProvider>
  )
}

const FocusPlayground = (props: FocusPlaygroundProps) => {
  return <FocusPlaygroundContainer {...props} />
}

const FocusPlaygroundStory = () => {
  return <FocusPlayground />
}

const FocusPlaygroundLockedVerticalStory = () => {
  return <FocusPlayground lockVertical />
}

const FocusPlaygroundInactiveTilesStory = () => {
  return <FocusPlayground inactiveTiles={['tile-2', 'tile-4']} />
}

const FocusPlaygroundArgsStory = (props: FocusPlaygroundProps) => {
  return <FocusPlayground {...props} />
}

const meta = {
  argTypes: {
    inactiveTiles: {
      control: 'check',
      options: TILE_IDS,
    },
    lockVertical: {
      control: 'boolean',
    },
  },
  args: {},
  component: FocusPlaygroundStory,
  parameters: {
    layout: 'centered',
  },
  title: 'Coong/Use/SpaceFocus/FocusPlayground',
} satisfies Meta<typeof FocusPlayground>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <FocusPlaygroundStory />,
}

export const LockedVertical: Story = {
  render: () => <FocusPlaygroundLockedVerticalStory />,
}

export const WithInactiveTiles: Story = {
  render: () => <FocusPlaygroundInactiveTilesStory />,
}

export const WithControls: Story = {
  args: {
    inactiveTiles: ['tile-3'],
    lockVertical: false,
  },
  render: (args: FocusPlaygroundProps) => <FocusPlaygroundArgsStory {...args} />,
}
