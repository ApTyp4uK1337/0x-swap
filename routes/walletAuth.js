import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, INFURA_API_KEY } from '../config.js';
import { getTimestamp } from '../utils.js';

const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`));

async function walletAuth(privateKey) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    if (!wallet[0]?.address) {
      return {
        status: false,
        error: 'Address not found in wallet',
        timestamp: getTimestamp(),
      };
    }

    return {
      status: true,
      response: {
        private_key: privateKey,
        wallet: wallet[0].address,
      },
      timestamp: getTimestamp(),
    };
  } catch (error) {
    return {
      status: false,
      error: 'Error processing wallet',
      details: error.message,
      timestamp: getTimestamp(),
    };
  }
}

router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];

  if (!apiKey || apiKey !== DEVELOPER_API_KEY) {
    return res.status(403).json({
      status: false,
      error: 'Forbidden: Invalid or missing API key',
      timestamp: getTimestamp(),
    });
  }

  const { private_key } = req.body;

  if (!private_key) {
    return res.status(400).json({
      status: false,
      error: 'Missing required parameters',
      params: req.body,
      timestamp: getTimestamp(),
    });
  }

  try {
    const response = await walletAuth(private_key);
    return res.status(response.status ? 200 : 400).json(response);
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'walletAuth failed',
      details: error.message,
      timestamp: getTimestamp(),
    });
  }
});

export default router;
