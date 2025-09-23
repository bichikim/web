import {h} from './html'
import {render} from './render-children'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {signal} from './signal'

beforeEach(() => {
  document.body.innerHTML = ''
})

// developing...
describe.skip('html', () => {
  it('should render', () => {
    const element: any = h('div')

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div></div>')
  })

  it('should render with props', () => {
    const element: any = h('div', {
      class: 'test',
    })

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div class="test"></div>')
  })

  it('should render with children', () => {
    const element: any = h('div', {}, [h('span', {}, ['Hello, world!']) as any])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div><span>Hello, world!</span></div>')
  })

  it.only('should render list', () => {
    const list = signal([1])
    const element: any = h('div', {}, [() => list().map((item) => h('span', {}, [item])) as any])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div><span>1</span></div>')
    list([1, 2])
    expect(document.body.innerHTML).toBe('<div><span>1</span><span>2</span></div>')
  })

  it('should addEventListeners', () => {
    const clickSpy = vi.fn()

    const element: any = h(
      'div',
      {
        onClick: clickSpy,
      },
      ['click me'],
    )

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div>click me</div>')
    document.body.querySelector('div')?.dispatchEvent(new Event('click'))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('should rerender and remove string', async () => {
    const isRender = signal(true)

    render(document.body, [() => (isRender() ? 'hello' : null)])
    expect(document.body.innerHTML).toBe('hello')
    isRender(false)
    expect(document.body.innerHTML).toBe('')
  })

  it('should rerender and remove component', async () => {
    const isRender = signal(true)

    render(document.body, [() => (isRender() ? h('div', {}, ['hello']) : null) as any])
    expect(document.body.innerHTML).toBe('<div>hello</div>')
    isRender(false)
    expect(document.body.innerHTML).toBe('')
  })

  it('should rerender, remove component and remove event listeners', async () => {
    const isRender = signal(true)
    const clickSpy = vi.fn()

    render(document.body, [() => (isRender() ? h('div', {onClick: clickSpy}, ['hello']) : null) as any])
    expect(document.body.innerHTML).toBe('<div>hello</div>')
    const element = document.body.querySelector('div')

    element?.dispatchEvent(new Event('click'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    isRender(false)
    expect(document.body.innerHTML).toBe('')
    element?.dispatchEvent(new Event('click'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('should rerender attrs', () => {
    const className = signal('test')
    const onMount = vi.fn()
    const onUnmount = vi.fn()
    const element: any = h('div', {class: className, onMount, onUnmount}, ['hello'])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div class="test">hello</div>')
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onUnmount).not.toHaveBeenCalled()
    className('test2')
    expect(document.body.innerHTML).toBe('<div class="test2">hello</div>')
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onUnmount).not.toHaveBeenCalled()
  })

  it('should rerender string children', () => {
    const text = signal('hello')
    const text2 = signal('world')
    const element: any = h('div', {}, [text, ' ', text2])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div>hello world</div>')
    text('real')
    expect(document.body.innerHTML).toBe('<div>real world</div>')
    text2('space')
    expect(document.body.innerHTML).toBe('<div>real space</div>')
  })

  it('should rerender component children', () => {
    const element: any = h('div', {}, [h('span', {}, ['hello']) as any])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div><span>hello</span></div>')
  })

  it.skip('should rerender list', () => {
    const list = signal([1])
    const element: any = h('div', {}, [() => list().map((item) => h('span', {}, [item])) as any])

    render(document.body, [element])
    expect(document.body.innerHTML).toBe('<div><span>1</span></div>')
    // list([2])
  })
})
