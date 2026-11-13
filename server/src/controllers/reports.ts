import { Response } from 'express';
import { AppData } from '../../../client/src/app/core/models/tracker';
import { reportBundle } from '../../../client/src/app/core/utils/daily-report';
import { AuthRequest } from '../middleware/auth';
import { load } from '../services/workspace';
import { reportQuery } from '../validators/reports';
export async function report(req: AuthRequest, res: Response) {
  const { period, date } = reportQuery.parse(req.query);
  const data = (await load(req.owner!)).data as AppData;
  res.json({ ok: true, data: reportBundle(data, period, date) });
}
