import {Solid} from './componets/Solid'
import {Original} from './componets/Original'
import {Vue} from './componets/Vue'

export const App: FC = withSolid(() => {

  return () => (
    <div>
      <section>
        solid
        <Solid />
      </section>
      <br />
      <section>
        original
        <Original />
      </section>
      <br />
      <section>
        vue
        <Vue />
      </section>
    </div>
  )
})
