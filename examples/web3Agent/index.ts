import { config } from '../../src/config/index.js';
import { createLogger } from '../../src/utils/logger.js';
import { validateLocalHash } from '../../src/blockchain/localHashStorage.js';
import {
  createOrchestratorRunner,
  OrchestratorRunner,
} from '../../src/agents/workflows/orchestrator/orchestratorWorkflow.js';
import { createPrompts } from '../../src/agents/workflows/orchestrator/prompts.js';
import { HumanMessage } from '@langchain/core/messages';
import { OrchestratorRunnerOptions } from '../../src/agents/workflows/orchestrator/types.js';
import { ethers } from 'ethers';
import { createTransferNativeTokenTool } from '../../src/agents/tools/evm/index.js';

const logger = createLogger('autonomous-twitter-agent');

const character = config.characterConfig;
const orchestratorConfig = async (): Promise<OrchestratorRunnerOptions> => {
  // Create transfer native token tool
  if (!config.blockchainConfig.PRIVATE_KEY || !config.blockchainConfig.RPC_URL) {
    throw new Error('PRIVATE_KEY and RPC_URL are required in the blockchainConfig');
  }
  const signer = new ethers.Wallet(
    config.blockchainConfig.PRIVATE_KEY,
    new ethers.JsonRpcProvider(config.blockchainConfig.RPC_URL),
  );
  const transferNativeTokenTool = createTransferNativeTokenTool(signer);

  //Orchestrator config
  //use default orchestrator prompts with character config from CLI  selfSchedule enabled
  const prompts = await createPrompts(character);

  //override default model configurations for summary and finish workflow nodes
  const modelConfigurations = {
    inputModelConfig: {
      provider: 'openai' as const,
      model: 'gpt-4o',
      temperature: 0.8,
    },
    messageSummaryModelConfig: {
      provider: 'openai' as const,
      model: 'gpt-4o',
      temperature: 0.8,
    },
    finishWorkflowModelConfig: {
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      temperature: 0.8,
    },
  };
  return {
    modelConfigurations,
    tools: [transferNativeTokenTool],
    prompts,
  };
};

const orchestrationConfig = await orchestratorConfig();
export const orchestratorRunner = (() => {
  let runnerPromise: Promise<OrchestratorRunner> | undefined = undefined;
  return async () => {
    if (!runnerPromise) {
      runnerPromise = createOrchestratorRunner(character, orchestrationConfig);
    }
    return runnerPromise;
  };
})();

const main = async () => {
  const runner = await orchestratorRunner();
  const initialMessage = `Transfer 0.01 ETH to 0x0F409152C9cDA318c3dB94c0693c1347E29E1Ea8`;
  try {
    await validateLocalHash();

    let message = initialMessage;
    while (true) {
      const result = await runner.runWorkflow({ messages: [new HumanMessage(message)] });

      message = `${result.summary}
      ${result.nextWorkflowPrompt}`;

      logger.info('Workflow execution result:', { result });

      const nextDelaySeconds = result.secondsUntilNextWorkflow ?? 3600;
      logger.info('Workflow execution completed successfully for character:', {
        characterName: config.characterConfig.name,
        runFinished: new Date().toISOString(),
        nextRun: `${nextDelaySeconds / 60} minutes`,
        nextWorkflowPrompt: message,
      });
      await new Promise(resolve => setTimeout(resolve, nextDelaySeconds * 1000));
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      logger.info('Process terminated by user');
      process.exit(0);
    }
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  logger.info('Received SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

main();
