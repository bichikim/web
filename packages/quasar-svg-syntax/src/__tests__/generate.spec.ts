import {generate} from '../generate'

describe('quasar-svg-syntax', () => {
  it('should return quasar svg string', async () => {
    const result = await generate(`
      <svg>
        <path d="M0 0 L10 10" />
      </svg>
    `)
    expect(result).toBe('M0 0 L10 10')
  })
  it('should return quasar svg string with viewBox', async () => {
    const result = await generate(`
      <svg viewBox="0 0 156 149">
        <path d="M0 0 L10 10" />
      </svg>
    `)
    expect(result).toBe('M0 0 L10 10|0 0 156 149')
  })
  it('should return quasar svg string with viewBox', async () => {
    const result = await generate(`
       <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512">
          <title>Arrow Undo</title>
          <path d="M240 424v-96c116.4 0 159.39 33.76 208 96 0-119.23-39.57-240-208-240V88L64 256z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/>
       </svg>
    `)

    // const Component = defineComponent({
    //   render() {
    //     return h(QIcon, {
    //       name: result,
    //     })
    //   },
    //   setup() {
    //     const quasar = useQuasar()
    //     quasar.iconMapFn = () => ({icon: 'foo'})
    //     return {}
    //   },
    // })
    //
    // const wrapper = mount(Component, {
    //   global: {
    //     plugins: [[Quasar, {
    //       req: {
    //         headers: {
    //           'Content-Type': 'html',
    //         },
    //       },
    //     }, {
    //       components: {},
    //       config: {},
    //       directives: {},
    //       plugins: {},
    //     }]],
    //   },
    // })

    expect(result).toBe('M240 424v-96c116.4 0 159.39 33.76 208 96 0-119.23-39.57-240-208-240V88L64 256z|0 0 512 512')
    // expect(wrapper.html()).toBe('<i class="q-icon q-icon-foo"></i>')
  })

  it('should return', () => {
    //
  })
})
