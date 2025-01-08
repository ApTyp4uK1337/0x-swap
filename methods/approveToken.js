import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, getTimestamp } from '../utils.js';

const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

async function approveToken(privateKey, chainId, sellToken, buyToken, sellAmount) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    const amount = web3.utils.toWei(sellAmount, 'ether');

    const quote = await getQuote(chainId, sellToken, buyToken, amount, wallet[0].address);

    if (quote.issues.allowance !== null) {
      const sellTokenABI = await getAbi(sellToken);
      const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

      await sellTokenContract.methods.approve(quote.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: wallet[0].address });
    }

    const abi = await getAbi(chainId, sellToken);
    const contract = new web3.eth.Contract(abi, sellToken);

    const [name, symbol, decimals, tokenBalance] = await Promise.all([
      contract.methods.name().call(),
      contract.methods.symbol().call(),
      contract.methods.decimals().call(),
      contract.methods.balanceOf(wallet[0].address).call()
    ]);

    return {
      status: true,
      response: {
        chain_id: Number(chainId),
        address: sellToken,
        symbol: symbol,
        name: name,
        decimals: Number(decimals),
        balance: Number(tokenBalance)
      },
      timestamp: getTimestamp()
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

  const { private_key, chain_id = 42161, sell_token, buy_token, amount = 10000 } = req.body;

  if (!private_key || !chain_id || !sell_token || !buy_token || !amount) {
    return res.status(400).json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await approveToken(private_key, chain_id, sell_token, buy_token, amount);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ status: false, error: 'approveToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;