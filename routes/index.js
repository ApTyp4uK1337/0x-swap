import express from 'express';
import ping from './ping.js';
import walletAuthRoutes from './walletAuth.js';
import getTokenDetails from './getTokenDetails.js'
import getTokenBalance from './getTokenBalance.js'

const router = express.Router();

router.use('/ping', ping);
router.use('/walletAuth', walletAuthRoutes);
router.use('/getTokenDetails', getTokenDetails);
router.use('/getTokenBalance', getTokenBalance);

export default router;