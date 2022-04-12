import {CoongCard} from '../index'

export const Default = () => {
  return {
    components: {
      CoongCard,
    },
    setup() {
      return {}
    },
    template: `
      <coong-card>
      hello
      </coong-card> `,
  }
}
