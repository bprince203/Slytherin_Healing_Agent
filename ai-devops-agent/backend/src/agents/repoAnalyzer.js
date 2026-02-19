export const repoAnalyzer = async (repoPath) => {
  return { stage: 'analyze', repoPath, findings: [] };
};
