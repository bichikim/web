import {Router as PreactRouter} from 'preact-router'
import {MainPage} from 'src/pages/main'

export const Router = () => {
  return (
    <PreactRouter>
      <MainPage path="/" />
    </PreactRouter>
  )
}
