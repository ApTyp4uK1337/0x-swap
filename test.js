import fs from 'fs';
import Web3 from 'web3';
import axios from 'axios';

const INFURA_API_KEY = '789575b58c67497aa56b8dad0b2b01fd';
const ETHERSCAN_API_KEY = 'EFFCKR22SST6MUQMI1SPXDEKN6Y6G3H82G';

const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`))

const privateKey = '0x01a8ab0f56985b955a6fc277373258a1a0c5874480a9cf955e51afeea6f211b5';

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const wallet = web3.eth.accounts.wallet.add(account);

async function getAbi(tokenAddress) {
  if (fs.existsSync(`./abi/${tokenAddress}.json`)) {
    const abi = JSON.parse(fs.readFileSync(`./abi/${tokenAddress}.json`, 'utf8'));

    return abi;
  }

  try {
    const response = await axios.get('https://api.etherscan.io/v2/api', {
      params: {
        chainid: '42161',
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

async function getTokenDetails(address) {
  const abi = await getAbi(address);
  const contract = new web3.eth.Contract(abi, address);

  try {
    const name = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();
    const decimals = await contract.methods.decimals().call();

    console.log('Token Name:', name);
    console.log('Token Symbol:', symbol);
    console.log('Token Decimals:', decimals);
  } catch (error) {
    console.error('Error getting token details:', error);
  }
}

async function getBalance(address, contractAddress) {
  const abi = await getAbi(contractAddress);
  const contract = new web3.eth.Contract(abi, contractAddress);

  try {
    const balance = await contract.methods.balanceOf(address).call();
    console.log(`Balance of ${address}:`, balance);
  } catch (error) {
    console.error('Error getting balance:', error);
  }
}

await getTokenDetails('0xd44257dde89ca53f1471582f718632e690e46dc2');
await getBalance('0xafee6822628b083a2d16c0cdd7ad845d7a4b82f5', '0xd44257dde89ca53f1471582f718632e690e46dc2');

// console.log(token);
// console.log(balance);