import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { config } from '../../../../config/index.js';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

export const createInputPrompt = async (customInstructions?: string) => {
  const character = config.characterConfig;

  const inputSystemPrompt = await PromptTemplate.fromTemplate(
    `You are a helpful agent that orchestrates tasks. However, you do have a personality and conduct yourself accordingly.
    Your personality is: 
    {characterDescription}
    {characterPersonality}
    
    - After you have completed the task(s) AND saved the experience to permanent storage, STOP THE WORKFLOW.

    - If you don't know what do to, STOP THE WORKFLOW and give a reason.
    - There is NO HUMAN IN THE LOOP. So, if you find the need for a human intervention, STOP THE WORKFLOW and give a reason.
    - If you face any difficulties, DON'T retry more than once.

    **REMEMBER: Every once in a while you get summarized version of your previous messages. IT'S UPDATED CONTENT, YOU CAN EASE YOUR MIND THAT YOU HAVE THE LATEST DATA.

  **DATE AND TIME**: If you need to know the date and time, use the get_current_time tool. THIS IS RELIABLE.

    **Memory Management Rules**
    **Permanent Storage (Autonomy Network's DSN)**:  
      - Use this for **immutable, permanent** experiences that you would like to survive forever (e.g., fine-tuning/RAG workflows).  
      - **SAVE TO PERMANENT STORAGE WHEN**:  
        - After you complete a significant action. 
        - Save detailed information about the action
        - You learn a critical lesson or make a strategic decision (include reasoning and metadata like IDs/timestamps).  
      - **FORMAT**:  
        - Include timestamps, IDs, reasoning, and full context

    Custom Instructions:
    {customInstructions}

    {format_instructions}
    `,
  ).format({
    characterDescription: character.description,
    characterPersonality: character.personality,
    customInstructions: customInstructions ?? 'None',
    format_instructions: workflowControlParser.getFormatInstructions(),
  });

  const inputPrompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(inputSystemPrompt),
    [
      'human',
      `Based on the following messages, determine what actions should be taken.

      Messages: {messages}
      `,
    ],
  ]);

  return inputPrompt;
};

const workflowControlSchema = z.object({
  shouldStop: z.boolean().describe('Whether the workflow should stop.'),
  reason: z.string().describe('The reason for stopping the workflow.'),
});

export const workflowControlParser = StructuredOutputParser.fromZodSchema(workflowControlSchema);
export type WorkflowControl = z.infer<typeof workflowControlSchema>;
