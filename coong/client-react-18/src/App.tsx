import {Solid} from './componets/Solid'
import {Original} from './componets/Original'
import {Vue} from './componets/Vue'
import {PropsSyncText} from './componets/PropsSyncText'

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
      <section>
        <PropsSyncText />
      </section>
    </div>
  )
})
