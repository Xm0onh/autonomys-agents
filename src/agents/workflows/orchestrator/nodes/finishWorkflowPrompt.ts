import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { config } from '../../../../config/index.js';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

export const createFinishWorkflowPrompt = async (
  customInstructions?: string,
  selfSchedule?: boolean,
) => {
  const character = config.characterConfig;

  const followFormatInstructions = `
  IMPORTANT:
  - Return ONLY the raw JSON data
  - DO NOT include any markdown formatting, code blocks, or backticks
  - DO NOT wrap response in code block markers
  - Do not include any additional text or explanations
  - The response should NOT start with \`\`\`json and end with \`\`\`
  - The response should start and end with curly braces`;

  const workflowSummarySystemPrompt = await PromptTemplate.fromTemplate(
    `
    Summarize the following messages in detail. This is being returned as a report to what was accomplished during the execution of the workflow.
    
    self-schedule:{selfSchedule} 
    If self-schedule:true 
    - Provide a recommendation for the next prompt for when the workflow begins again in the nextWorkflowPrompt field.
    - Provide a recommendation for how long until the next workflow should begin in the secondsUntilNextWorkflow field.
    If self-schedule:false 
    - Do not include any values in the nextWorkflowPrompt or secondsUntilNextWorkflow fields.

    You have a personality, so you should act accordingly.
    {characterDescription}
    {characterPersonality}

    Custom Instructions:
    {customInstructions}
    
    {followFormatInstructions}
    Format Instructions:
    {formatInstructions}`,
  ).format({
    characterDescription: character.description,
    characterPersonality: character.personality,
    customInstructions: customInstructions ?? 'None',
    formatInstructions: finishedWorkflowParser.getFormatInstructions(),
    followFormatInstructions,
    selfSchedule: selfSchedule ? 'true' : 'false',
  });

  const workflowSummaryPrompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(workflowSummarySystemPrompt),
    [
      'human',
      `This workflow is ending at {currentTime}. 
      Messages:
      {messages}`,
    ],
  ]);

  return workflowSummaryPrompt;
};

const finishedWorkflowSchema = z.object({
  workflowSummary: z.string().describe('A detailedsummary of the workflow.'),
  nextWorkflowPrompt: z
    .string()
    .optional()
    .describe(
      'If self-scheduling is enabled, this field will be the input prompt for the next workflow. Be thoughtful about what you want to accomplish in the next workflow and write this as a prompt.',
    ),
  secondsUntilNextWorkflow: z
    .number()
    .optional()
    .describe(
      'If self-scheduling is enabled, this field will be the recommended number of seconds until the workflow should begin again.',
    ),
});

export const finishedWorkflowParser = StructuredOutputParser.fromZodSchema(finishedWorkflowSchema);
export type FinishedWorkflow = z.infer<typeof finishedWorkflowSchema>;
