import Web3 from 'web3';
import axios from 'axios';
import ethSigUtil from "@metamask/eth-sig-util";

// Настройка подключения к сети Arbitrum через RPC
const web3 = new Web3(new Web3.providers.HttpProvider("https://arbitrum-mainnet.infura.io/v3/789575b58c67497aa56b8dad0b2b01fd"))

// Адреса и ключи
const privateKey = '0x01a8ab0f56985b955a6fc277373258a1a0c5874480a9cf955e51afeea6f211b5';
const fromAddress = '0xafee6822628b083a2d16c0cdd7ad845d7a4b82f5';
const amountIn = web3.utils.toWei('268817505', 'ether');

// 0x API endpoint для получения маршрута обмена
const zeroXAPI = 'https://api.0x.org/swap/permit2/quote';

// Функция для получения маршрута обмена и выполнения транзакции
async function executeSwap() {
  try {
    const response = await axios.get(zeroXAPI, {
      params: {
        chainId: '42161',
        sellToken: '0xd44257dde89ca53f1471582f718632e690e46dc2', // Указание адреса токена для продажи
        buyToken: '0xc95e481e86d71d7892dbb7d1f4e98455e4e52ca7',
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

    const erc20abi = [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "oldTeam",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "newTeam",
            "type": "address"
          }
        ],
        "name": "ChangeTeam",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferPrepared",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "_NEW_OWNER_",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "_OWNER_",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "zeroAddress",
            "type": "address"
          }
        ],
        "name": "abandonOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          }
        ],
        "name": "allowance",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "balance",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newTeam",
            "type": "address"
          }
        ],
        "name": "changeTeamAccount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "claimOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_totalSupply",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "_name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_symbol",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "_decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "_tradeBurnRatio",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_tradeFeeRatio",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "_team",
            "type": "address"
          }
        ],
        "name": "init",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "initOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "team",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "tradeBurnRatio",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "tradeFeeRatio",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    // web3.eth.accounts.wallet.add(wallet);

    const ERC20TokenContract = new web3.eth.Contract(erc20abi, '0xd44257dde89ca53f1471582f718632e690e46dc2');

    if (quote.issues.allowance !== null) {
      const approvalTxData = ERC20TokenContract.approve(quote.issues.allowance.spender, amountIn).encodeABI();
      await web3.eth.sendTransaction(approvalTxData);
    }

    // if (quote.issues.allowance !== null) {
    //   const approve = await ERC20TokenContract.methods
    //     .approve(quote.issues.allowance.spender, amountIn)
    //     .send({ from: fromAddress })
    //     .then((approve) => {
    //       console.log("Approve transaction successful: ", approve);
    //     });
    // }

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
    // const receipt = await web3.eth.sendTransaction(tx);

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
