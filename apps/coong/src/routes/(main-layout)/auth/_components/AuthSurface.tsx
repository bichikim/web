import {cx} from 'class-variance-authority'
import {type JSX, type ParentProps} from 'solid-js'

export interface AuthSurfaceProps extends ParentProps {
  title: string
  titleClass?: string
  footer?: JSX.Element
}

const authSurfaceMainClass =
  ':uno: flex min-h-screen items-center justify-center bg-#f4f5f7 px-5 py-10 text-#101114'

const authSurfaceSectionClass = cx(
  ':uno: w-full max-w-96 rounded-3 bg-white p-8',
  'shadow-[0_18px_48px_rgba(17,18,22,0.12)] ring-1 ring-black/6',
)

export const AuthSurface = (props: AuthSurfaceProps): JSX.Element => {
  return (
    <main class={authSurfaceMainClass}>
      <section class={authSurfaceSectionClass}>
        <h1 class={`:uno: mb-6 text-center text-6 font-900 leading-7 ${props.titleClass ?? ''}`}>
          {props.title}
        </h1>
        {props.children}
        {props.footer}
      </section>
    </main>
  )
}
