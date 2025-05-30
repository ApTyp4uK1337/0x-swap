import express from 'express';
import Web3 from 'web3';
import ethSigUtil from "@metamask/eth-sig-util";
import { HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, convertBigIntToString } from '../utils.js';

const router = express.Router();
const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

function addAccountToWallet(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  return account;
}

async function swapTokens(privateKey, chainId, sellToken, buyToken, amount, slippage = 100, nonce = null) {
  let account;
  let approve = false;

  try {
    account = addAccountToWallet(privateKey);

    const amountIn = web3.utils.toWei(amount.toString(), 'ether').toString();

    const quote = await getQuote(chainId, sellToken, buyToken, amountIn, account.address, slippage);

    if (quote.issues.allowance !== null) {
      const sellTokenABI = await getAbi();
      const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

      await sellTokenContract.methods.approve(quote.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: account.address });
    }

    let txData = quote.transaction.data;

    if (quote.permit2 && quote.permit2.eip712) {
      const signature = ethSigUtil.signTypedData({
        privateKey: privateKey.slice(2),
        data: quote.permit2.eip712,
        version: 'V4',
      });

      if (!signature) {
        throw new Error("Не удалось подписать данные");
      }

      const signatureLength = web3.utils.hexToBytes(web3.utils.toHex(signature)).length;
      let signatureLengthInHex = web3.utils.padLeft(web3.utils.toHex(signatureLength), 64, '0');
      txData = quote.transaction.data + signatureLengthInHex.slice(2) + signature.slice(2);
    }

    if (nonce === null) {
      nonce = await web3.eth.getTransactionCount(account.address, 'pending');
    }

    const tx = {
      chainId: chainId,
      from: account.address,
      to: quote.transaction.to,
      data: txData,
      value: quote.transaction.value.toString(),
      gas: quote.transaction.gas.toString(),
      gasPrice: (Math.ceil(Number(quote.transaction.gasPrice) * 1.2)).toString(),
      nonce: nonce.toString(),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction).catch((error) => {
      if (error.message.includes('was not mined within')) {
        console.warn('Transaction mining is taking longer than expected. Continuing execution...');
        return null;
      } else {
        throw error;
      }
    });

    if (!receipt) {
      for (let i = 0; i < 10; i++) {
        console.log(`Checking transaction receipt... (${i + 1}/10)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pendingReceipt = await web3.eth.getTransactionReceipt(signedTx.transactionHash);
        if (pendingReceipt) {
          receipt = pendingReceipt;
          break;
        }
      }
    }

    if (!receipt) {
      console.warn('Transaction not mined after multiple attempts.');

      return {
        status: true,
        response: {
          tx_hash: signedTx.transactionHash,
          sell_token: sellToken,
          buy_token: buyToken,
          sell_amount: amount.toString(),
          buy_amount: '0',
          gas_used: '0',
          approve: approve,
          note: 'Transaction not mined even after retries, please verify on chain.',
        },
        timestamp: new Date(),
      };
    }

    let buyAmount = 0;

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

    try {
      const quote2 = await getQuote(chainId, buyToken, sellToken, quote.minBuyAmount, account.address, slippage);

      if (quote2.issues.allowance !== null) {
        const buyTokenABI = await getAbi();
        const buyTokenContract = new web3.eth.Contract(buyTokenABI, buyToken);

        await buyTokenContract.methods.approve(quote2.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: account.address });

        approve = true;
      } else {
        approve = true;
      }
    } catch (error) {
      console.warn('Ignoring error from quote2:', error.message);
    }

    return {
      status: true,
      response: {
        tx_hash: receipt.transactionHash,
        sell_token: sellToken,
        buy_token: buyToken,
        sell_amount: amount.toString(),
        buy_amount: buyAmount.toString() ?? '0',
        gas_used: receipt.gasUsed.toString(),
        approve: approve
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: false,
      response: {
        error: error.message,
      },
      timestamp: new Date(),
    };
  } finally {
    if (account) {
      web3.eth.accounts.wallet.remove(account.address);
    }
  }
}

router.post('/', async (req, res) => {
  try {
    const { private_key, chain_id = 42161, sell_token, buy_token, amount, slippage = 100, nonce = null } = req.body;

    if (!private_key || !chain_id || !sell_token || !buy_token || !amount) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters',
        params: req.body,
        timestamp: new Date(),
      });
    }

    const response = await swapTokens(private_key, chain_id, sell_token, buy_token, amount, slippage, nonce);
    return res.status(200).json(convertBigIntToString(response));
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 'swapTokens failed',
      details: error.message,
      timestamp: new Date(),
    });
  }
});

export default router;