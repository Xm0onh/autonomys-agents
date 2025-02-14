import { createAllTwitterTools } from '../../tools/twitterTools.js';
import { TwitterApi } from '../../../services/twitter/types.js';
import { createSaveExperienceTool } from '../../tools/saveExperienceTool.js';
import { createGetCurrentTimeTool } from '../../tools/getTimeTool.js';
import { VectorDB } from '../../../services/vectorDb/VectorDB.js';
import {
  createLearnedExpVectorDbSearchTool,
  createVectorDbSearchTool,
} from '../../tools/vectorDbTools.js';

export const createTools = (
  twitterApi: TwitterApi,
  vectorDb: VectorDB,
  memoryVectorDb: VectorDB,
) => {
  const twitterTools = createAllTwitterTools(twitterApi);
  const saveExperienceTool = createSaveExperienceTool();
  const getCurrentTimeTool = createGetCurrentTimeTool();
  const vectorDbSearchTool = createVectorDbSearchTool(vectorDb);
  const learnedExpVectorDbSearchTool = createLearnedExpVectorDbSearchTool(memoryVectorDb);
  return [
    ...twitterTools,
    saveExperienceTool,
    getCurrentTimeTool,
    vectorDbSearchTool,
    learnedExpVectorDbSearchTool,
  ];
};
