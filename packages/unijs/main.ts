import {computed, h, render, signal} from './src'
import 'virtual:uno.css'

const List = () => {
  const list = signal([1])

  const add = () => {
    list([...list(), list().length + 1])
  }

  return h('div', {}, [
    //
    h('button', {onClick: add}, ['add']),
    h('ul', {}, [() => list().map((item) => h('li', {}, [item]))]),
  ])
}

const Root = () => {
  const count = signal(0)
  const toggle = signal(false)

  const increment = () => {
    count(count() + 1)
  }

  const decrement = () => {
    count(count() - 1)
  }

  const sizeStyle = computed(() => {
    return {
      width: `${count() * 10 + 20}px`,
    }
  })

  const toggleRender = () => {
    toggle(!toggle())
  }

  return h('div', {class: 'bg-red-100 flex flex-col'}, [
    h('button', {onClick: increment}, ['+']),
    h('span', {class: 'text-red-500'}, [count]),
    h('span', {class: 'text-blue-500 bg-blue-100', style: sizeStyle}, ['??']),
    () => (toggle() ? h('span', {}, ['showing']) : h('span', {}, ['hidden'])),
    h('button', {onClick: toggleRender}, [() => (toggle() ? 'stop' : 'start')]),
    h('button', {onClick: decrement}, ['-']),
    List,
  ])
}

const appElement = document.querySelector('#app')

if (appElement) {
  render(appElement, [Root])
}
