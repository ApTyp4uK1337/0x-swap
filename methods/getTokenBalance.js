import express from 'express';
import Web3 from 'web3';
import { HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, convertBigIntToString } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function getTokenBalance(privateKey, chainId, tokenAddress = null) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const ethBalance = await web3.eth.getBalance(account.address);

    const response = {
      status: true,
      response: {
        0: ethBalance.toString()
      },
      timestamp: new Date(),
    };

    if (tokenAddress) {
      const abi = await getAbi();
      const contract = new web3.eth.Contract(abi, tokenAddress);
      const balance = await contract.methods.balanceOf(account.address).call();

      response.response[tokenAddress] = balance.toString();
    }

    return response;
  } catch (error) {
    throw new Error(`Failed to retrieve token balance: ${error.message}`);
  } finally {
    if (account) {
      web3.eth.accounts.wallet.remove(account.address);
    }
  }
}

router.post('/', async (req, res) => {
  try {
    const { private_key, chain_id = 42161, address = null } = req.body;

    if (!private_key || !chain_id) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: new Date(),
      });
    }

    const response = await getTokenBalance(private_key, chain_id, address);
    return res.status(200).json(convertBigIntToString(response));
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'getTokenBalance failed',
      details: error.message,
      timestamp: new Date(),
    });
  }
});

export default router;
