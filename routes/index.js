import express from 'express';
import authRoutes from './auth.js';

const router = express.Router();

// Подключение маршрутов
router.use('/auth', authRoutes);

export default router;