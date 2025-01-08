import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getTimestamp } from '../utils.js';

const router = express.Router();

async function getTokenDetails(privateKey, chainId, address) {
  const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    const abi = await getAbi(chainId, address);
    const contract = new web3.eth.Contract(abi, address);

    try {
      const name = await contract.methods.name().call();
      const symbol = await contract.methods.symbol().call();
      const decimals = await contract.methods.decimals().call();
      const balance = await contract.methods.balanceOf(wallet[0].address).call();

      return {
        status: true,
        response: {
          chain_id: Number(chainId),
          address: address,
          symbol: symbol,
          name: name,
          decimals: Number(decimals),
          balance: Number(balance)
        },
        timestamp: getTimestamp()
      }
    } catch (error) {
      return {
        status: true,
        error: 'Error getting token details',
        details: error,
        timestamp: getTimestamp()
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];

  if (!apiKey || apiKey !== DEVELOPER_API_KEY) {
    return res.status(403).json({ status: false, error: 'Forbidden: Invalid or missing API key', timestamp: getTimestamp() });
  }

  const { private_key, chain_id = 42161, address } = req.body;

  if (!private_key || !chain_id || !address) {
    return res.status(400).json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: getTimestamp() });
  }

  try {
    const response = await getTokenDetails(private_key, chain_id, address);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ status: false, error: 'getTokenDetails failed', details: error.message, timestamp: getTimestamp() });
  }
});

export default router;