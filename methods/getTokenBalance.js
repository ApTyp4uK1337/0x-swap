import express from 'express';
import Web3 from 'web3';
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getTimestamp } from '../utils.js';

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

async function getTokenBalance(privateKey, chainId, tokenAddress = null) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const ethBalance = await web3.eth.getBalance(account.address);

    const response = {
      status: true,
      response: {
        0: {
          chain_id: Number(chainId),
          address: account.address,
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: ethBalance.toString()
        },
      },
      timestamp: getTimestamp(),
    };

    if (tokenAddress) {
      const abi = await getAbi(chainId, tokenAddress);
      const contract = new web3.eth.Contract(abi, tokenAddress);
      const tokenDetails = await fetchTokenDetails(contract, account.address);

      response.response[tokenAddress] = {
        chain_id: Number(chainId),
        address: tokenAddress,
        symbol: tokenDetails.symbol,
        name: tokenDetails.name,
        decimals: Number(tokenDetails.decimals),
        balance: tokenDetails.balance.toString()
      };
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
    const apiKey = req.headers['developer-api-key'];
    if (apiKey !== DEVELOPER_API_KEY) {
      return res.status(403).json({
        status: false,
        error: 'Forbidden: Invalid or missing API key',
        timestamp: getTimestamp(),
      });
    }

    const { private_key, chain_id = 42161, address = null } = req.body;

    if (!private_key || !chain_id) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: getTimestamp(),
      });
    }

    const response = await getTokenBalance(private_key, chain_id, address);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'getTokenBalance failed',
      details: error.message,
      timestamp: getTimestamp(),
    });
  }
});

export default router;
