import {mount} from '@vue/test-utils'

const ROOT_APP_ID = 'app'

export const createAppElement = () => {
  const result = document.querySelector(`#${ROOT_APP_ID}`)

  if (!result) {
    document.body.innerHTML = `
      <div>
        <div id="${ROOT_APP_ID}"></div>
      </div>
    `
  }

  return document.querySelector(`#${ROOT_APP_ID}`)
}

export const mountDom: typeof mount = (originalComponent, options) => {
  const root = createAppElement()

  const wrapper = mount(originalComponent, options)

  root?.append(wrapper.element)

  return wrapper
}
