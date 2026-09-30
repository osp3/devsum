/**
 * Supported OpenAI models - single source of truth for backend and Settings UI
 * reasoningEffort 'none' allows temperature; any other effort rejects it
 */
export const OPENAI_MODELS = {
  'gpt-6-luna': { label: 'GPT-6 Luna (Fast & Cost Effective)', reasoningEffort: 'none', maxDiffSize: 30000 },
  'gpt-6.1-sol': { label: 'GPT-6.1 Sol (Balanced)', reasoningEffort: 'low', maxDiffSize: 40000 },
  'gpt-6-astra': { label: 'GPT-6 Astra (Most Capable)', reasoningEffort: 'low', maxDiffSize: 40000 },
};

export const DEFAULT_OPENAI_MODEL = 'gpt-6-luna';

export const isSupportedModel = (model) => Object.hasOwn(OPENAI_MODELS, model);

export const resolveModel = (model) => (isSupportedModel(model) ? model : DEFAULT_OPENAI_MODEL);

export const getModelConfig = (model) => OPENAI_MODELS[resolveModel(model)];

export const listModels = () =>
  Object.entries(OPENAI_MODELS).map(([value, { label }]) => ({ value, label }));
