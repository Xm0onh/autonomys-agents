import { AIMessage } from '@langchain/core/messages';
import { createLogger } from '../../../../utils/logger.js';
import { OrchestratorConfig, OrchestratorState } from '../types.js';
import { config } from '../../../../config/index.js';
const logger = createLogger('summary-node');

export const createSummaryNode = ({ orchestratorModel, prompts }: OrchestratorConfig) => {
  const runNode = async (state: typeof OrchestratorState.State) => {
    logger.info('Summary Node');
    logger.info('State size:', { size: state.messages.length });

    if (state.messages.length > config.orchestratorConfig.MAX_WINDOW_SUMMARY) {
      const prevSummary = state.messages[1]?.content || 'No previous summary';
      const messagesToSummarize = state.messages.slice(1);

      const newMessages = messagesToSummarize
        .map(msg => {
          const content =
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2);
          return `${msg.getType()}: ${content}`;
        })
        .join('\n');

      const formattedPrompt = await prompts.summaryPrompt.format({
        prevSummary,
        newMessages,
      });

      logger.info('Formatted prompt:', { formattedPrompt });
      const newSummary = await orchestratorModel.invoke(formattedPrompt);
      logger.info('New Summary Result:', { newSummary });

      return {
        messages: [
          new AIMessage({ content: `Summary of conversation earlier: ${newSummary.content}` }),
        ],
      };
    }

    logger.info('Not summarizing, not enough messages');
    return { messages: state.messages };
  };
  return runNode;
};
