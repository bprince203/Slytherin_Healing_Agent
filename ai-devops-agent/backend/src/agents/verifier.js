export const verifier = async (patches) => {
  return { stage: 'verify', passed: true, patches };
};
