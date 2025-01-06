import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import Web3 from 'web3';
import axios from 'axios';
import ethSigUtil from "@metamask/eth-sig-util";

const app = express();
app.use(bodyParser.json());

const ZEROX_API_KEY = '661ea407-1a57-4484-92a4-36e9c948b09d';
const ETHERSCAN_API_KEY = 'EFFCKR22SST6MUQMI1SPXDEKN6Y6G3H82G';
const INFURA_API_KEY = '789575b58c67497aa56b8dad0b2b01fd';

const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`))

const privateKey = '0x01a8ab0f56985b955a6fc277373258a1a0c5874480a9cf955e51afeea6f211b5';

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const wallet = web3.eth.accounts.wallet.add(account);

const chainId = '42161';
const sellToken = '0x6ceb7abc1b001b2f874185ac4932e7aee83970ef';
const buyToken = '0xd44257dde89ca53f1471582f718632e690e46dc2';
const amountIn = web3.utils.toWei('0.00004859', 'ether');

async function getAbi(tokenAddress) {
  if (fs.existsSync(`./abi/${tokenAddress}.json`)) {
    const abi = JSON.parse(fs.readFileSync(`./abi/${tokenAddress}.json`, 'utf8'));

    return abi;
  }

  try {
    const response = await axios.get('https://api.etherscan.io/v2/api', {
      params: {
        chainid: chainId,
        module: 'contract',
        action: 'getabi',
        address: tokenAddress,
        apikey: ETHERSCAN_API_KEY
      }
    });

    if (response.data && response.data.status === '1') {
      const abi = JSON.parse(response.data.result);

      fs.mkdirSync('./abi', { recursive: true });
      fs.writeFileSync(`./abi/${tokenAddress}.json`, JSON.stringify(abi, null, 2), 'utf8');

      return abi;
    } else {
      throw new Error(`Ошибка API: ${response.data.message || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error(`Не удалось загрузить ABI: ${error.message}`);

    throw error;
  }
}

async function getQuote(chainId, sellToken, buyToken, amountIn, walletAddress) {
  try {
    const { data } = await axios.get('https://api.0x.org/swap/permit2/quote', {
      params: {
        chainId: chainId,
        sellToken,
        buyToken,
        sellAmount: amountIn,
        taker: walletAddress,
      },
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2',
      },
    });

    if (!data || !data.transaction) {
      throw new Error('Invalid transaction data from ZeroX API');
    }

    return data;
  } catch (error) {
    console.error('Ошибка получения котировки:', error.message);

    throw error;
  }
}

async function executeSwap(chainId, sellToken, buyToken, amountIn) {
  try {
    const quote = await getQuote(chainId, sellToken, buyToken, amountIn, wallet[0].address);

    if (quote.issues.allowance !== null) {
      const sellTokenABI = await getAbi(sellToken);
      const sellTokenContract = new web3.eth.Contract(sellTokenABI, sellToken);

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
      gas: quote.transaction.gas,
      gasPrice: quote.transaction.gasPrice,
    };

    console.log('Transaction data:', tx);

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log(receipt);

    if (!receipt.status) {
      const error = await web3.eth.getTransactionError(signedTx.hash);
      console.error('Transaction failed:', error);
    } else {
      console.log('Transaction successful:', receipt);

      const quote2 = await getQuote(chainId, buyToken, sellToken, quote.minBuyAmount, wallet[0].address);

      if (quote2.issues.allowance !== null) {
        const buyTokenABI = await getAbi(buyToken);
        const buyTokenContract = new web3.eth.Contract(buyTokenABI, buyToken);

        await buyTokenContract.methods.approve(quote2.issues.allowance.spender, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({ from: wallet[0].address });
      }
    }
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}

async function auth(privateKey) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = web3.eth.accounts.wallet.add(account);

    if (wallet[0]?.address) {
      return {
        status: true,
        response: {
          wallet: wallet[0].address,
        },
        timestamp: new Date(),
      };
    } else {
      return {
        status: false,
        error: 'Address not found in wallet',
        timestamp: new Date(),
      };
    }
  } catch (error) {
    console.error('Error in auth function:', error.message);
    return {
      status: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

app.get('/swap', async (req, res) => {
  const { chainId, sellToken, buyToken, amountIn } = req.query;

  if (!chainId || !sellToken || !buyToken || !amountIn) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await executeSwap(chainId, sellToken, buyToken, web3.utils.toWei(amountIn, 'ether'));
    return res.status(200).json({ success: 'Swap executed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to execute swap', details: error.message });
  }
});

app.get('/auth', async (req, res) => {
  const { uid, private_key } = req.query;

  if (!uid || !private_key) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const response = await auth(privateKey);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to execute swap', details: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
