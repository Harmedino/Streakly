import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config/index';
import { Session, User, Workspace } from './models/index';
import { Backup } from './services/workspace';
async function main() {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Session.init(), Workspace.init(), Backup.init()]);
  await Workspace.updateMany({ draftEpoch: { $exists: false } }, { $set: { draftEpoch: 0 } });
  const server = app.listen(config.PORT, '0.0.0.0', () =>
    console.log(`Streakly API listening on ${config.PORT}`),
  );
  const stop = () =>
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
main().catch((error) => {
  console.error('Streakly could not start:', error.name);
  process.exitCode = 1;
});
