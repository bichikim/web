const COLORS = ['#e11d48', '#2563eb', '#059669', '#ca8a04', '#7c3aed', '#0891b2']
const USER_NAME_ID_LENGTH = 4

export const createUser = () => {
  const [id] = crypto.getRandomValues(new Uint32Array(1))
  const color = COLORS[id % COLORS.length]

  return {
    color,
    name: `User ${String(id).slice(0, USER_NAME_ID_LENGTH)}`,
  }
}
