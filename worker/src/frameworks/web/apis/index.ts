import * as express from 'express';
import { fork } from 'child_process';
import redis from 'redis';
import RedisAccessor from '../../../redis-accessor/redis-accessor.impl';

const redisAccessor = new RedisAccessor(redis);
const router: express.Router = express.Router();

router.get('/process/totalcount/:searchTerm', async (req: express.Request, res: express.Response) => {
  console.log(req.params);
  // spwan child process
  // wait until child process return the total count
  // return totalcount to client
  return res.status(200).end();
});

router.post('/process/start', async (_req: express.Request, res: express.Response) => {
  const childProcess = fork(__dirname + '../../../../email-collector/email-collector.impl');
  console.log(childProcess);
  // this request should be a websocket endpoint
  // start the child process and instruct worker to start scraping
  // inform client when requeest stop, finished, errored
  // merge put endpoint into this post endpoint (i.e., get input to stop the process as if the server is getting the chat message from client)
  return res.status(200).end();
});

router.put('/process/stop', async (req: express.Request, res: express.Response) => {
  // this request might not needed
  console.log(req);
  return res.status(200).end();
});

router.get('/process/result', async (_req: express.Request, res: express.Response) => {
  const result = await redisAccessor.getStoreDetails();
  return res.status(200).json(result);
});

export default router;
