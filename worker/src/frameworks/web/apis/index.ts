import * as express from 'express';
import { ChildProcess, fork } from 'child_process';
import redis from 'redis';
import RedisAccessor from '../../../redis-accessor/redis-accessor.impl';

const redisAccessor = new RedisAccessor(redis);
const router: express.Router = express.Router();

let childProcess: ChildProcess | null = null;

router.get('/process/totalcount/:searchTerm', async (req: express.Request, res: express.Response) => {
  console.log(req.params);
  return res.status(200).end();
});

router.post('/process/start', async (_req: express.Request, res: express.Response) => {
  if (childProcess === null) {
    childProcess = fork(__dirname + '../../../../email-collector/email-collector.impl');
    return res.status(200).end();
  } else {
    return res.status(400).json('Bad request: process already running');
  }
});

router.put('/process/stop', async (_req: express.Request, res: express.Response) => {
  if (childProcess !== null) {
    childProcess.kill();
    childProcess = null;
    return res.status(200).json('Process has terminated');
  } else {
    return res.status(400).json('Bad request: no process is running');
  }
});

router.get('/process/result', async (_req: express.Request, res: express.Response) => {
  const result = await redisAccessor.getStoreDetails();
  return res.status(200).json(result);
});

export default router;
