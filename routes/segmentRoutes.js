import express from 'express';
import { createSegment, getAllSegments, getSegmentById, updateSegment, deleteSegment, generateSegmentNL } from '../controllers/segmentController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateSegmentCreate, validateSegmentUpdate, validateSegmentGenerate } from '../middlewares/validator.js';

const router = express.Router();

// Apply authentication middleware to all segment routes
router.use(authenticate);

router.post('/', validateSegmentCreate, createSegment);
router.post('/generate', validateSegmentGenerate, generateSegmentNL);
router.get('/', getAllSegments);
router.get('/:id', getSegmentById);
router.put('/:id', validateSegmentUpdate, updateSegment);
router.delete('/:id', deleteSegment);

export default router;
