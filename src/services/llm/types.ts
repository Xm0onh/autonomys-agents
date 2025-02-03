export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  DEEPSEEK = 'deepseek',
}

export type LLMConfiguration = {
  provider: LLMProvider;
  model: string;
};

export type LLMNodeConfiguration = {
  provider: LLMProvider;
  model: string;
  temperature: number;
};
