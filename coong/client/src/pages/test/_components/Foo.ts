export const Foo = defineComponent((_, {slots}) => {
  return () => html` <div>hello ${slots.default?.()}</div> `
})
