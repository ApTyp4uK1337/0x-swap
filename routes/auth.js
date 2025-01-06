import express from 'express';
import Web3 from 'web3';

const router = express.Router();

export async function auth(privateKey) {
  const web3 = new Web3();
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
    throw new Error(error.message);
  }
}
router.post('/', async (req, res) => {
  const apiKey = req.headers['developer-api-key'];
  const expectedApiKey = '123456';

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing API key' });
  }

  const { uid, private_key } = req.body;

  if (!uid || !private_key) {
    return res.status(400).json(req.body);
  }

  try {
    const response = await auth(private_key);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: 'Auth failed', details: error.message });
  }
});

export default router;