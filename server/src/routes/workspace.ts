import { Router } from 'express';
import * as controller from '../controllers/workspace';
import { protect } from '../middleware/auth';
export const workspace = Router();
workspace.use(protect);
workspace.get('/workspace', controller.getWorkspace);
workspace.put('/workspace', controller.putWorkspace);
workspace.get('/migration/status', controller.getMigrationStatus);
workspace.post('/migration/preview', controller.postMigrationPreview);
workspace.post('/migration', controller.postMigration);
workspace.post('/reset', controller.postReset);
workspace.post('/planner/clear-completed', controller.postPlannerClearCompleted);
workspace.get('/backup', controller.getBackup);
workspace.get('/backup/previous', controller.getBackupPrevious);
workspace.get('/reports', controller.getReports);
workspace.get('/profile', controller.getProfile);
workspace.patch('/profile', controller.patchProfile);
workspace.get('/:section', controller.getSection);
for (const method of ['post', 'put', 'delete'] as const)
  workspace[method](
    method === 'post' ? ['/:section/:id', '/:section'] : ['/:section/:id'],
    controller.mutateResource(method),
  );
