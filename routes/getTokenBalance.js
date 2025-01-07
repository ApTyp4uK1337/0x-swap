import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, INFURA_API_KEY } from '../config.js';
import { getAbi } from '../utils.js';

const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`));

async function getTokenBalance(privateKey, chainId, address = null) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    const defaultBalance = await web3.eth.getBalance(wallet[0].address);

    const response = {
      status: true,
      response: {
        0: {
          chain_id: Number(chainId),
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          balance: Number(defaultBalance)
        }
      },
      timestamp: new Date()
    };

    if (address) {
      const abi = await getAbi(chainId, address);
      const contract = new web3.eth.Contract(abi, address);

      const [name, symbol, decimals, tokenBalance] = await Promise.all([
        contract.methods.name().call(),
        contract.methods.symbol().call(),
        contract.methods.decimals().call(),
        contract.methods.balanceOf(wallet[0].address).call()
      ]);

      response.response[address] = {
        chain_id: Number(chainId),
        address: address,
        symbol: symbol,
        name: name,
        decimals: Number(decimals),
        balance: Number(tokenBalance)
      };
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];

  if (!apiKey || apiKey !== DEVELOPER_API_KEY) {
    return res.status(403).json({ status: false, error: 'Forbidden: Invalid or missing API key', timestamp: new Date() });
  }

  const { private_key, chain_id = 42161, address = null } = req.body;

  if (!private_key || !chain_id) {
    return res.status(400).json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await getTokenBalance(private_key, chain_id, address);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ status: false, error: 'getTokenBalance failed', details: error.message, timestamp: new Date() });
  }
});

export default router;
