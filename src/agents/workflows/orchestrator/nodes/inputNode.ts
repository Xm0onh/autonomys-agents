import { createLogger } from '../../../../utils/logger.js';
import { OrchestratorConfig, OrchestratorState } from '../types.js';
import { workflowControlParser } from './inputPrompt.js';
const logger = createLogger('orchestrator-input-node');

const parseWorkflowControl = async (content: unknown) => {
  if (typeof content === 'string') {
    try {
      return await workflowControlParser.parse(content);
    } catch (error) {
      logger.error('Failed to parse workflow control. Applying fallback termination.', {
        error,
        content,
      });
      return { shouldStop: true, reason: 'Failed to parse control message' };
    }
  }
  return undefined;
};

export const createInputNode = ({ orchestratorModel, prompts }: OrchestratorConfig) => {
  const runNode = async (state: typeof OrchestratorState.State) => {
    const { messages } = state;
    logger.info('Running input node with messages:', {
      messages: messages.map(message => message.content),
    });
    const formattedPrompt = await prompts.inputPrompt.format({
      messages: messages.map(message => message.content),
    });
    const result = await orchestratorModel.invoke(formattedPrompt);

    const usage = result.additional_kwargs?.usage as
      | { input_tokens: number; output_tokens: number }
      | undefined;
    logger.info('Result:', {
      content: result.content,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
    });

    const workflowControl = await parseWorkflowControl(result.content);

    const newMessage = { messages: [result] };
    if (workflowControl) {
      return { ...newMessage, workflowControl };
    }
    return newMessage;
  };
  return runNode;
};
