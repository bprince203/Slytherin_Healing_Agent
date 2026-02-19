export function createBranch(branchName) {
  return `git checkout -b ${branchName}`;
}
