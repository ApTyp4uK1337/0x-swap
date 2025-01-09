import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, getTimestamp } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER));

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function fetchTokenDetails(contract, address) {
  const [name, symbol, decimals, balance] = await Promise.all([
    contract.methods.name().call(),
    contract.methods.symbol().call(),
    contract.methods.decimals().call(),
    contract.methods.balanceOf(address).call(),
  ]);

  return { name, symbol, decimals: Number(decimals), balance: balance.toString() };
}

async function approveToken(privateKey, chainId, sellToken, buyToken, sellAmount) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const amount = web3.utils.toWei(sellAmount.toString(), 'ether');

    const quote = await getQuote(chainId, sellToken, buyToken, amount, account.address);
    const abi = await getAbi(chainId, sellToken);
    const contract = new web3.eth.Contract(abi, sellToken);

    if (quote.issues.allowance) {
      await contract.methods
        .approve(
          quote.issues.allowance.spender,
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        )
        .send({ from: account.address });
    }

    const tokenDetails = await fetchTokenDetails(contract, account.address);

    return {
      status: true,
      response: {
        chain_id: Number(chainId),
        address: sellToken,
        ...tokenDetails,
      },
      timestamp: getTimestamp(),
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

  const { private_key, chain_id = 42161, sell_token, buy_token, amount = 10000 } = req.body;

  if (!private_key || !chain_id || !sell_token || !buy_token || !amount) {
    return res
      .status(400)
      .json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await approveToken(private_key, chain_id, sell_token, buy_token, amount);
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, error: 'approveToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;
