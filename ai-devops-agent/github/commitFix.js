export function commitFix(message = 'chore: apply automated fix') {
  return `git add . && git commit -m "${message}"`;
}
