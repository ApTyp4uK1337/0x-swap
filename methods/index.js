import express from 'express';
import ping from './ping.js';
import walletAuth from './walletAuth.js';
import initToken from './initToken.js';
import getTokenBalance from './getTokenBalance.js';
import getTokenAllowance from './getTokenAllowance.js';
import approveToken from './approveToken.js';
import getTransactionCount from './getTransactionCount.js';
import swapTokens from './swapTokens.js';

const router = express.Router();

router.use('/ping', ping);
router.use('/walletAuth', walletAuth);
router.use('/initToken', initToken);
router.use('/getTokenBalance', getTokenBalance);
router.use('/getTokenAllowance', getTokenAllowance);
router.use('/approveToken', approveToken);
router.use('/getTransactionCount', getTransactionCount);
router.use('/swapTokens', swapTokens);

export default router;