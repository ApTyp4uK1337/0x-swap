import express from 'express';
import Web3 from 'web3';
import { HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

async function initToken(chainId, token) {
  try {
    const abi = await getAbi();
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
  }
}

router.post('/', async (req, res) => {
  const { chain_id = 42161, token } = req.body;

  if (!chain_id || !token) {
    return res
      .status(400)
      .json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await initToken(chain_id, token);
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, error: 'initToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;
