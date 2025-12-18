export const TRUSTED_ORIGINS = ['https://coong.io', ...(import.meta.env.PROD ? [] : ['http://localhost:3000'])]
