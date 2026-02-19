export function pushChanges(remote = 'origin', branch = 'main') {
  return `git push ${remote} ${branch}`;
}
