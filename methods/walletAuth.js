import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';

const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);
  return account;
}

async function walletAuth(privateKey) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    if (!account.address) {
      throw new Error('Address not found in wallet');
    }

    return {
      status: true,
      response: {
        private_key: privateKey,
        wallet: account.address,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: false,
      error: 'Error processing wallet',
      details: error.message,
      timestamp: new Date(),
    };
  } finally {
    if (account) {
      web3.eth.accounts.wallet.remove(account.address);
    }
  }
}

router.post('/', async (req, res) => {
  try {
    const apiKey = req.headers['developer-api-key'];

    if (apiKey !== DEVELOPER_API_KEY) {
      return res.status(403).json({
        status: false,
        error: 'Forbidden: Invalid or missing API key',
        timestamp: new Date(),
      });
    }

    const { private_key } = req.body;

    if (!private_key) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: new Date(),
      });
    }

    const response = await walletAuth(private_key);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'walletAuth failed',
      details: error.message,
      timestamp: new Date(),
    });
  }
});

export default router;
