import { Router } from 'express';
import authRouter from './auth.js';
import configRouter from './config.js';
import profilesRouter from './profiles.js';
const router = Router();
router.use('/auth', authRouter);
router.use('/api', configRouter);
router.use('/api', profilesRouter);
export default router;
