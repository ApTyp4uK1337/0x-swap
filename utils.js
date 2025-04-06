import fs from 'fs';
import axios from 'axios';
import { ZEROX_API_KEY } from './config.js';

export async function getAbi() {
  if (fs.existsSync(`./abi/erc20abi.json`)) {
    const abi = JSON.parse(fs.readFileSync(`./abi/erc20abi.json`, 'utf8'));

    return abi;
  }
}

export async function getQuote(chainId, sellToken, buyToken, sellAmount, taker, slippageBps = 100) {
  try {
    const { data } = await axios.get('https://api.0x.org/swap/permit2/quote', {
      params: {
        chainId,
        sellToken,
        buyToken,
        sellAmount,
        taker,
        slippageBps
      },
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2',
      },
    });

    if (!data || !data.transaction) {
      throw new Error('Invalid transaction data from 0x API');
    }

    return data;
  } catch (error) {
    console.error('Ошибка получения котировки:', error.message);

    throw error;
  }
}

export function convertBigIntToString(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}