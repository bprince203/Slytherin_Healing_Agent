import { repoAnalyzer } from './repoAnalyzer.js';
import { bugDetector } from './bugDetector.js';
import { fixGenerator } from './fixGenerator.js';
import { verifier } from './verifier.js';

export const runWorkflow = async (repoPath) => {
  const analysis = await repoAnalyzer(repoPath);
  const issues = await bugDetector(analysis);
  const patches = await fixGenerator(issues);
  const result = await verifier(patches);
  return result;
};
