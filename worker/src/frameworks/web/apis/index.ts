import * as express from 'express';

const router: express.Router = express.Router();

router.get('/process/totalcount/:searchTerm', async (req: express.Request, res: express.Response) => {
  console.log(req.params);
  // spwan child process
  // wait until child process return the total count
  // return totalcount to client
  return res.status(200).end();
});

router.post('/process/start', async (req: express.Request, res: express.Response) => {
  console.log(req);
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

router.get('/process/result', async (req: express.Request, res: express.Response) => {
  // fetch scraped result from redis and return to client
  console.log(req);
  return res.status(200).end();
});

export default router;
