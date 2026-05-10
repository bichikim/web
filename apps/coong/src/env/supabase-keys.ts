export const getSupabaseClientKeys = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (typeof url !== 'string' || typeof key !== 'string') {
    throw new TypeError(
      'VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set',
    )
  }

  return {key, url}
}
