import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function initToken(privateKey, chainId, token) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const abi = await getAbi(chainId, token);
    const contract = new web3.eth.Contract(abi, token);

    const [name, symbol, decimals] = await Promise.all([
      contract.methods.name().call(),
      contract.methods.symbol().call(),
      contract.methods.decimals().call(),
    ]);

    return {
      status: true,
      response: {
        chain_id: Number(chainId),
        address: token,
        symbol: symbol,
        name: name,
        decimals: Number(decimals)
      },
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(error.message);
  } finally {
    if (account) {
      web3.eth.accounts.wallet.remove(account.address);
    }
  }
}

router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];

  if (apiKey !== DEVELOPER_API_KEY) {
    return res
      .status(403)
      .json({ status: false, error: 'Forbidden: Invalid or missing API key', timestamp: new Date() });
  }

  const { private_key, chain_id = 42161, token } = req.body;

  if (!private_key || !chain_id || !token) {
    return res
      .status(400)
      .json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await initToken(private_key, chain_id, token);
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, error: 'initToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;
