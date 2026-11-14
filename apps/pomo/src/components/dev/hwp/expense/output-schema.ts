import {z} from 'zod'

const MAXIMUM_ITEMS = 20

export const expenseOutputSchema = z.toJSONSchema(
  z.strictObject({
    date: z.string().nullable(),
    items: z
      .array(
        z.strictObject({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
        }),
      )
      .max(MAXIMUM_ITEMS),
    questions: z.array(z.string()),
  }),
)
