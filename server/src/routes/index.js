import { Router } from 'express';
import { metaRouter } from './meta.js';
import { stationsRouter } from './stations.js';
import { observationsRouter } from './observations.js';
import { predictionsRouter } from './predictions.js';
import { severityRouter } from './severity.js';
import { openaqRouter } from './openaq.js';
import { locationRouter } from './location.js';
import { hotspotRouter } from './hotspots.js';

export const apiRouter = Router();

apiRouter.use('/meta', metaRouter);
apiRouter.use('/stations', stationsRouter);
apiRouter.use('/observations', observationsRouter);
apiRouter.use('/predictions', predictionsRouter);
apiRouter.use('/severity', severityRouter);
apiRouter.use('/openaq', openaqRouter);
apiRouter.use('/location', locationRouter);
apiRouter.use('/hotspots', hotspotRouter);
