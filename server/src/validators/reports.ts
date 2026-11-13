import { z } from 'zod';
import { validDate } from '../../../client/src/app/core/utils/dates';
export const reportQuery = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z.string().refine(validDate, 'Choose a valid report date.'),
});
