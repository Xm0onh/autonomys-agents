import { Router } from 'express';
import { getAllDsn, getMemoryByCid, saveMemoryRecord } from '../db/index.js';
import { downloadMemory } from '../utils/dsn.js';
import { createLogger } from '../utils/logger.js';
import { ResponseStatus } from '../types/enums.js';
import { transformMemoryToLegacy } from '../utils/transformers.js';
import { isMemoryV2_0_0 } from '../types/generated/v2_0_0.js';
import { processPreviousCids } from '../utils/backgroundProcessor.js';

const router = Router();
const logger = createLogger('memories-router');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as ResponseStatus | undefined;
    const searchText = req.query.search as string | undefined;
    const authorUsername = req.query.author as string | undefined;
    
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100' 
      });
      return;
    }

    if (type && !Object.values(ResponseStatus).includes(type)) {
      res.status(400).json({
        error: `Invalid type parameter. Must be one of: ${Object.values(ResponseStatus).join(', ')}`
      });
      return;
    }

    const dsnRecords = await getAllDsn(page, limit, type, searchText, authorUsername);
    
    if (!dsnRecords.data || dsnRecords.data.length === 0) {
      res.json({
        data: [],
        pagination: {
          total: 0,
          page: page,
          limit: limit,
          totalPages: 0
        },
        message: 'No memory found'
      });
      return;
    }

    res.json(dsnRecords);
  } catch (error) {
    logger.error('Error fetching DSN records:', error);
    res.status(500).json({ error: 'Failed to fetch DSN records' });
  }
});

router.get('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;        
    let memory = await getMemoryByCid(cid);
    console.log('memory', memory);
    if (!memory) {
      const memoryData = await downloadMemory(cid);
      if (!memoryData) {
        res.status(404).json({ error: 'Memory not found' });
        return;
      }
      console.log('memoryData', memoryData);
      await saveMemoryRecord(cid, memoryData, memoryData?.previousCid);
      memory = await getMemoryByCid(cid);
      processPreviousCids(memoryData?.previousCid);
    }
     // Transform v2.0.0 memories to match frontend expectations
    if (isMemoryV2_0_0(memory?.content)) {
      const transformedMemory = transformMemoryToLegacy(memory?.content);
      res.json(transformedMemory);
      return;
    } 
    res.json(memory?.content);
  } catch (error) {
    logger.error('Error fetching memory:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

export default router; 