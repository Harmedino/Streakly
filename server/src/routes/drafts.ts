import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, protect } from '../middleware/auth';
import { ApiError } from '../middleware/errors';
import { Workspace } from '../models/index';
import { load } from '../services/workspace';
import { cleanRichText } from '../utils/rich-text';
export const drafts = Router();
drafts.use(protect);
drafts.get('/learning', async (req: AuthRequest, res) => {
  const workspace = await load(req.owner!);
  const d = workspace.draft as {
    title: string;
    content: string;
    format?: 'html' | 'markdown';
  } | null;
  res.json({
    ok: true,
    data: {
      epoch: workspace.draftEpoch ?? 0,
      title: d?.title ?? '',
      content: d?.content ?? '',
      format: d?.format ?? 'markdown',
    },
  });
});
drafts.put('/learning', async (req: AuthRequest, res) => {
  const { epoch, ...draft } = z
    .object({
      epoch: z.number().int().nonnegative(),
      title: z.string().max(200),
      content: z.string().max(50000),
      format: z.enum(['html', 'markdown']).optional(),
    })
    .strict()
    .parse(req.body);
  if (draft.format === 'html') draft.content = cleanRichText(draft.content);
  const result = await Workspace.updateOne(
    { userId: req.owner!, draftEpoch: epoch },
    { $set: { draft } },
  );
  if (!result.matchedCount)
    throw new ApiError(
      409,
      'DRAFT_RESET',
      'The workspace was reset while this draft was open. Copy this text before reopening the editor.',
    );
  res.json({ ok: true, data: null });
});
drafts.delete('/learning', async (req: AuthRequest, res) => {
  const { epoch } = z.object({ epoch: z.number().int().nonnegative() }).strict().parse(req.body);
  const result = await Workspace.updateOne(
    { userId: req.owner!, draftEpoch: epoch },
    { $set: { draft: null } },
  );
  if (!result.matchedCount)
    throw new ApiError(409, 'DRAFT_RESET', 'This draft belongs to an earlier workspace.');
  res.json({ ok: true, data: null });
});
