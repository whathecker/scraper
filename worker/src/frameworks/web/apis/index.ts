import * as express from 'express';

const router: express.Router = express.Router();

router.get('/process/totalcount/:searchTerm', async (req: express.Request, res: express.Response) => {
  console.log(req.params);
  return res.status(200).end();
});

router.post('/process/start', async (req: express.Request, res: express.Response) => {
  console.log(req);
  return res.status(200).end();
});

router.put('/process/stop', async (req: express.Request, res: express.Response) => {
  console.log(req);
  return res.status(200).end();
});

router.get('/process/result', async (req: express.Request, res: express.Response) => {
  console.log(req);
  return res.status(200).end();
});

export default router;
