export interface AppTitleProps {
  class?: string
  onHome?: () => void
}

export const AppTitle = () => {
  return <h1 class="text-4xl font-bold">Welcome to Coong World</h1>
}
