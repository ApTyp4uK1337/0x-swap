import fs from 'fs';
import Web3 from 'web3';
import axios from 'axios';
import ethSigUtil from "@metamask/eth-sig-util";

const web3 = new Web3(new Web3.providers.HttpProvider("https://arbitrum-mainnet.infura.io/v3/789575b58c67497aa56b8dad0b2b01fd"))

const privateKey = '0x01a8ab0f56985b955a6fc277373258a1a0c5874480a9cf955e51afeea6f211b5';
const fromAddress = '0xafee6822628b083a2d16c0cdd7ad845d7a4b82f5';
const amountIn = web3.utils.toWei('268817505', 'ether');

const zeroXAPI = 'https://api.0x.org/swap/permit2/quote';

const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(wallet);

async function executeSwap() {
  try {
    const response = await axios.get(zeroXAPI, {
      params: {
        chainId: '42161',
        sellToken: '0xd44257dde89ca53f1471582f718632e690e46dc2',
        buyToken: '0x6ceb7abc1b001b2f874185ac4932e7aee83970ef',
        sellAmount: amountIn,
        taker: fromAddress,
      },
      headers: {
        '0x-api-key': '661ea407-1a57-4484-92a4-36e9c948b09d',
        '0x-version': 'v2'
      }
    });

    if (!response.data || !response.data.transaction) {
      throw new Error('Invalid transaction data from API');
    }

    const quote = response.data;

    const erc20abi = JSON.parse(fs.readFileSync('./abi/0xd44257dde89ca53f1471582f718632e690e46dc2.json', 'utf8'));

    const ERC20TokenContract = new web3.eth.Contract(erc20abi, '0xd44257dde89ca53f1471582f718632e690e46dc2');

    if (quote.issues.allowance !== null) {
      const approve = await ERC20TokenContract.methods.approve(quote.issues.allowance.spender, amountIn).send({ from: fromAddress });
    }

    const signature = ethSigUtil.signTypedData({ privateKey: privateKey.slice(2), data: quote.permit2.eip712, version: 'V4' });
    const signatureLength = web3.utils.hexToBytes(web3.utils.toHex(signature)).length;
    let signatureLengthInHex = web3.utils.padLeft(web3.utils.toHex(signatureLength), 64, '0');
    const txData = quote.transaction.data + signatureLengthInHex.slice(2) + signature.slice(2);

    const tx = {
      from: fromAddress,
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
    }
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}

executeSwap();
