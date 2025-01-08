import express from 'express';
import Web3 from 'web3';
import ethSigUtil from "@metamask/eth-sig-util";
import { DEVELOPER_API_KEY, HTTP_RPC_PROVIDER } from '../config.js';
import { getAbi, getQuote, getTimestamp } from '../utils.js';

const router = express.Router();

const web3 = new Web3(new Web3.providers.HttpProvider(HTTP_RPC_PROVIDER))

async function swapToken(privateKey, chainId, sellToken, buyToken, amount, slippage, sellEntireBalance) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    const amountIn = web3.utils.toWei(amount.toString(), 'ether');

    const quote = await getQuote(chainId, sellToken, buyToken, amountIn, wallet[0].address, slippage, sellEntireBalance);

    const sellTokenABI = await getAbi(chainId, sellToken);
    const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

    if (quote.issues.allowance !== null) {
      await sellTokenContract.methods.approve(quote.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: wallet[0].address });
    }

    const signature = ethSigUtil.signTypedData({ privateKey: privateKey.slice(2), data: quote.permit2.eip712, version: 'V4' });
    const signatureLength = web3.utils.hexToBytes(web3.utils.toHex(signature)).length;
    let signatureLengthInHex = web3.utils.padLeft(web3.utils.toHex(signatureLength), 64, '0');
    const txData = quote.transaction.data + signatureLengthInHex.slice(2) + signature.slice(2);

    const tx = {
      from: wallet[0].address,
      to: quote.transaction.to,
      data: txData,
      value: '0',
      gas: Math.floor(Number(quote.transaction.gas) * 1.2).toString(),
      gasPrice: quote.transaction.gasPrice,
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    if (!receipt.status) {
      const error = await web3.eth.getTransactionError(signedTx.hash);


      console.error('Transaction failed:', error);
    } else {
      console.log('Transaction successful:', receipt);

      const quote2 = await getQuote(chainId, buyToken, sellToken, quote.minBuyAmount, wallet[0].address, slippage);

      const buyTokenABI = await getAbi(chainId, buyToken);
      const buyTokenContract = new web3.eth.Contract(buyTokenABI, buyToken);

      if (quote2.issues.allowance !== null) {
        await buyTokenContract.methods.approve(quote2.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: wallet[0].address });
      }

      const transferEventSignature = web3.utils.sha3('Transfer(address,address,uint256)');
      const transferEvents = receipt.logs.filter(log => log.topics[0] === transferEventSignature);

      let buyAmount = 0;

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

        buyAmount = decodedEvent.value;
      } else {
        console.log('Transfer event not found');
      }

      const defaultBalance = await web3.eth.getBalance(wallet[0].address);

      const [sellTokenResult, buyTokenResult] = await Promise.all([
        Promise.all([
          sellTokenContract.methods.name().call(),
          sellTokenContract.methods.symbol().call(),
          sellTokenContract.methods.decimals().call(),
          sellTokenContract.methods.balanceOf(wallet[0].address).call(),
        ]),
        Promise.all([
          buyTokenContract.methods.name().call(),
          buyTokenContract.methods.symbol().call(),
          buyTokenContract.methods.decimals().call(),
          buyTokenContract.methods.balanceOf(wallet[0].address).call(),
        ]),
      ]);

      return {
        status: true,
        response: {
          tx_hash: receipt.transactionHash,
          sell_token: sellToken,
          buy_token: buyToken,
          sell_amount: Number(amount),
          buy_amount: Number(buyAmount) ?? 0,
          gas_used: Number(receipt.gasUsed),
          tokens: {
            0: {
              chain_id: Number(chainId),
              symbol: "ETH",
              name: "Ethereum",
              decimals: 18,
              balance: Number(defaultBalance)
            },
            [sellToken]: {
              chain_id: Number(chainId),
              symbol: sellTokenResult[1],
              name: sellTokenResult[0],
              decimals: Number(sellTokenResult[2]),
              balance: Number(sellTokenResult[3])
            },
            [buyToken]: {
              chain_id: Number(chainId),
              symbol: buyTokenResult[1],
              name: buyTokenResult[0],
              decimals: Number(buyTokenResult[2]),
              balance: Number(buyTokenResult[3])
            }
          }
        },
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
    return res.status(403).json({ status: false, error: 'Forbidden: Invalid or missing API key', timestamp: new Date() });
  }

  const { private_key, chain_id = 42161, sell_token, buy_token, amount, slippage = 100, sell_entire_balance = null } = req.body;

  if (!private_key || !chain_id || !sell_token || !buy_token || !amount || !slippage) {
    return res.status(400).json({ status: false, error: 'Missing required parameters', params: req.body, timestamp: new Date() });
  }

  try {
    const response = await swapToken(private_key, chain_id, sell_token, buy_token, amount, slippage, sell_entire_balance);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ status: false, error: 'swapToken failed', details: error.message, timestamp: new Date() });
  }
});

export default router;