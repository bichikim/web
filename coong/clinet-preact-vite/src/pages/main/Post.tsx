export interface PostProps {
  message: string
  title: string
}

export const Post = ({message, title}: PostProps) => {
  return (
    <div>
      <span>{title}</span>
      <span>{message}</span>
    </div>
  )
}
