const TEXT_MOOD_MODEL_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900'

export const TEXT_MOOD_MODEL = {
  assetHost: 'https://pub-0e34511083544f8aaad14d0590013528.r2.dev/',
  assetPathTemplate: `models/text-mood/{model}/${TEXT_MOOD_MODEL_REVISION}/`,
  dimension: 384,
  dtype: 'q8',
  pooling: 'mean',
  repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  revision: TEXT_MOOD_MODEL_REVISION,
} as const
