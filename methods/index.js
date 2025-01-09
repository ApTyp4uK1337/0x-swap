import express from 'express';
import ping from './ping.js';
import walletAuthRoutes from './walletAuth.js';
import getTokenBalance from './getTokenBalance.js'
import approveToken from './approveToken.js'
import swapTokens from './swapTokens.js'

const router = express.Router();

router.use('/ping', ping);
router.use('/walletAuth', walletAuthRoutes);
router.use('/getTokenBalance', getTokenBalance);
router.use('/approveToken', approveToken);
router.use('/swapTokens', swapTokens);

export default router;