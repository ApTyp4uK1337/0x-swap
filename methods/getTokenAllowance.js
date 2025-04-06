import express from 'express';
import Web3 from 'web3';
import { HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, convertBigIntToString } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function getTokenAllowance(privateKey, chainId, sellToken, buyToken, sellAmount) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const amount = web3.utils.toWei(sellAmount, 'ether').toString();
    const maxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const quote = await getQuote(chainId, sellToken, buyToken, amount, account.address);
    const abi = await getAbi();

    const contract = new web3.eth.Contract(abi, sellToken);

    if (quote.issues.allowance) {
      const allowance = await contract.methods
        .allowance(account.address, quote.issues.allowance.spender)
        .call();

      console.log(`Allowance: ${web3.utils.fromWei(allowance)} tokens`);
    } else {
      return {
        status: true,
        timestamp: new Date(),
      };
    }
  } catch (error) {
    console.error('Error fetching allowance:', error);
  }
}

router.post('/', async (req, res) => {
  const { private_key, chain_id = 42161, sell_token, buy_token, amount = 10000 } = req.body;

  if (!private_key || !chain_id || !sell_token || !buy_token || !amount) {
    return res
      .status(400)
      .json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await getTokenAllowance(private_key, chain_id, sell_token, buy_token, amount);
    return res.status(200).json(convertBigIntToString(response));
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, error: 'getTokenAllowance failed', details: error.message, timestamp: new Date() });
  }
});

export default router;
