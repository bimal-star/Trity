import type OpenAI from 'openai';

let openaiModulePromise: Promise<typeof import('openai')> | null = null;

/** Single dynamic import so `openai` (and tr46/mappingTable.json) stay out of eager server bundles. */
export function getOpenAIModule(): Promise<typeof import('openai')> {
  return (openaiModulePromise ??= import('openai'));
}

/**
 * Server-side OpenAI client. Passes org/project when set so project-scoped keys
 * (`sk-proj-...`) resolve Assistants and other resources in the correct project.
 */
export async function createOpenAIClient(apiKey: string): Promise<OpenAI> {
  const { default: OpenAICtor } = await getOpenAIModule();
  const organization = process.env.OPENAI_ORG_ID?.trim() || undefined;
  const project = process.env.OPENAI_PROJECT_ID?.trim() || undefined;
  return new OpenAICtor({
    apiKey,
    ...(organization ? { organization } : {}),
    ...(project ? { project } : {}),
  });
}
