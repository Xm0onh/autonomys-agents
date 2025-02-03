import { createInputNode } from './nodes/inputNode.js';
import { createSummaryNode } from './nodes/summaryNode.js';
import { createWorkflowSummaryNode } from './nodes/workflowSummaryNode.js';
import { OrchestratorConfig } from './types.js';

export const createNodes = async (config: OrchestratorConfig) => {
  const inputNode = createInputNode(config);
  const summaryNode = createSummaryNode(config);
  const workflowSummaryNode = createWorkflowSummaryNode(config);
  const toolNode = config.toolNode;

  return {
    inputNode,
    summaryNode,
    workflowSummaryNode,
    toolNode,
  };
};
