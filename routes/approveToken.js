import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, INFURA_API_KEY } from '../config.js';
import { getQuote } from '../utils.js';

const router = express.Router();

async function approveToken(privateKey, chainId, sellToken, buyToken) {
  const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`))

  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    const quote = await getQuote(chainId, sellToken, buyToken, amountIn, wallet[0].address);

    if (quote.issues.allowance !== null) {
      const sellTokenABI = await getAbi(sellToken);
      const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

      await sellTokenContract.methods.approve(quote.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: wallet[0].address });
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];

  if (!apiKey || apiKey !== DEVELOPER_API_KEY) {
    return res.status(403).json({ status: false, error: 'Forbidden: Invalid or missing API key', timestamp: new Date() });
  }

  const { private_key, chain_id = 42161, sell_token, buy_token } = req.body;

  if (!private_key || !chain_id || !sell_token || !buy_token) {
    return res.status(400).json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await approveToken(private_key, chain_id, sell_token, buy_token);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ status: false, error: 'approveToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;