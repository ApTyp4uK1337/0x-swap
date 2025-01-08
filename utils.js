import fs from 'fs';
import axios from 'axios';
import { ETHERSCAN_API_KEY, ZEROX_API_KEY } from './config.js';

export function getTimestamp() {
  return new Date();
}

export async function getAbi(chainId, tokenAddress) {
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

export async function getQuote(chainId, sellToken, buyToken, sellAmount, taker, slippageBps = 100, sellEntireBalance = null) {
  try {
    const { data } = await axios.get('https://api.0x.org/swap/permit2/quote', {
      params: {
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        taker,
        slippageBps,
        sellEntireBalance
      },
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2',
      },
    });

    if (!data || !data.transaction) {
      throw new Error('Invalid transaction data from 0x API');
    }

    console.log(data);

    return data;
  } catch (error) {
    console.error('Ошибка получения котировки:', error.message);

    throw error;
  }
}