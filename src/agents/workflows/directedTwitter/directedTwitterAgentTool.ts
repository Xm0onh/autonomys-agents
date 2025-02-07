import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createLogger } from '../../../utils/logger.js';
import { getWorkflowRunner } from './twitterWorkflow.js';

const logger = createLogger('directed-twitter-workflow-tool');

export const createDirectedTwitterAgentTool = () =>
  new DynamicStructuredTool({
    name: 'directed_twitter_workflow',
    description:
      'Workflow to check twitter for mentions, replies and trends, to respond to tweets and mentions and to post tweets',
    schema: z.object({}),
    func: async () => {
      try {
        const runner = await getWorkflowRunner();
        const result = await runner.runWorkflow();
        return result;
      } catch (error) {
        logger.error('Twitter workflow error:', error);
        throw error;
      }
    },
  });
