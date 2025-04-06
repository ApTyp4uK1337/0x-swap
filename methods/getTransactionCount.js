import express from 'express';
import Web3 from 'web3';
import ethSigUtil from "@metamask/eth-sig-util";
import { HTTP_RPC_PROVIDER } from '../config.js';
import { convertBigIntToString } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function getTransactionCount(privateKey) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const nonce = await web3.eth.getTransactionCount(account.address, 'pending');

    return {
      status: true,
      response: {
        count: nonce,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: false,
      response: {
        error: error.message,
      },
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
    const { private_key } = req.body;

    if (!private_key) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: new Date(),
      });
    }

    const response = await getTransactionCount(private_key);
    return res.status(200).json(convertBigIntToString(response));
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'getTransactionCount failed',
      details: error.message,
      timestamp: new Date(),
    });
  }
});

export default router;