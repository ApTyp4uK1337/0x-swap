import fs from 'fs';
import Web3 from 'web3';
import axios from 'axios';

const INFURA_API_KEY = '789575b58c67497aa56b8dad0b2b01fd';

const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`))

const privateKey = '0x01a8ab0f56985b955a6fc277373258a1a0c5874480a9cf955e51afeea6f211b5';

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const wallet = web3.eth.accounts.wallet.add(account);

console.log(wallet);