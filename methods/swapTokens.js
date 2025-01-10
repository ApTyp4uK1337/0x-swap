import express from 'express';
import Web3 from 'web3';
import ethSigUtil from "@metamask/eth-sig-util";
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, getTimestamp, convertBigIntToString } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function swapTokens(privateKey, chainId, sellToken, buyToken, amount, slippage) {
  let account;

  try {
    account = addAccountToWallet(privateKey);

    const amountIn = web3.utils.toWei(amount, 'ether').toString();

    const quote = await getQuote(chainId, sellToken, buyToken, amountIn, account.address, slippage);

    const sellTokenABI = await getAbi(chainId, sellToken);
    const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

    if (quote.issues.allowance !== null) {
      await sellTokenContract.methods.approve(quote.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: account.address });
    }

    const signature = ethSigUtil.signTypedData({ privateKey: privateKey.slice(2), data: quote.permit2.eip712, version: 'V4' });
    const signatureLength = web3.utils.hexToBytes(web3.utils.toHex(signature)).length;
    let signatureLengthInHex = web3.utils.padLeft(web3.utils.toHex(signatureLength), 64, '0');
    const txData = quote.transaction.data + signatureLengthInHex.slice(2) + signature.slice(2);

    const tx = {
      from: account.address,
      to: quote.transaction.to,
      data: txData,
      value: '0',
      gas: quote.transaction.gas.toString(),
      gasPrice: quote.transaction.gasPrice.toString(),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    if (receipt.status) {
      try {
        const quote2 = await getQuote(chainId, buyToken, sellToken, quote.minBuyAmount, account.address, slippage);

        const buyTokenABI = await getAbi(chainId, buyToken);
        const buyTokenContract = new web3.eth.Contract(buyTokenABI, buyToken);

        if (quote2.issues.allowance !== null) {
          await buyTokenContract.methods.approve(quote2.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: account.address });
        }
      } catch (error) {
        console.error('Error during secondary quote retrieval or processing:', error.message);
      }

      let buyAmount = 0

      const transferEventSignature = web3.utils.sha3('Transfer(address,address,uint256)');
      const transferEvents = receipt.logs.filter(log => log.topics[0] === transferEventSignature);

      if (transferEvents.length > 0) {
        const lastTransferEvent = transferEvents.pop();
        const decodedEvent = web3.eth.abi.decodeLog(
          [
            { type: 'address', name: 'from', indexed: true },
            { type: 'address', name: 'to', indexed: true },
            { type: 'uint256', name: 'value' },
          ],
          lastTransferEvent.data,
          lastTransferEvent.topics.slice(1)
        );

        buyAmount = decodedEvent.value.toString();
      }

      return {
        status: receipt.status,
        response: {
          tx_hash: receipt.transactionHash,
          sell_token: sellToken,
          buy_token: buyToken,
          sell_amount: amount.toString(),
          buy_amount: buyAmount.toString() ?? '0',
          gas_used: receipt.gasUsed.toString(),
        },
        timestamp: getTimestamp()
      };
    }
  } catch (error) {
    console.error('Transaction failed:', error.message);
    return {
      status: false,
      response: {
        error: error.message,
      },
      timestamp: getTimestamp()
    };
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

    const { private_key, chain_id = 42161, sell_token, buy_token, amount, slippage = 100 } = req.body;

    if (!private_key) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: getTimestamp(),
      });
    }

    const response = await swapTokens(private_key, chain_id, sell_token, buy_token, amount, slippage);
    return res.status(200).json(convertBigIntToString(response));
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'swapTokens failed',
      details: error.message,
      timestamp: getTimestamp(),
    });
  }
});

export default router;