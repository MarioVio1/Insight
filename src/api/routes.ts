import { Router } from 'express';
import authRouter from './auth.js';
import configRouter from './config.js';
const router = Router();
router.use('/auth', authRouter);
router.use('/api', configRouter);
export default router;
