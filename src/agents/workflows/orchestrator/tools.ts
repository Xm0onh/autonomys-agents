import { createSaveExperienceTool } from '../../tools/autonomysAutoDrive/index.js';
import { createGetCurrentTimeTool } from '../../tools/time/index.js';
export const createTools = () => {
  const saveExperienceTool = createSaveExperienceTool();
  const getCurrentTimeTool = createGetCurrentTimeTool();

  return {
    saveExperienceTool,
    getCurrentTimeTool,
    tools: [saveExperienceTool, getCurrentTimeTool],
  };
};
