const GITHUB_TOKEN_KEY = 'ai-devops-copilot.githubToken';
const AI_API_KEY_KEY = 'ai-devops-copilot.aiApiKey';

export type StoredAccessKeys = {
  githubToken: string;
  aiApiKey: string;
};

export function loadStoredAccessKeys(): StoredAccessKeys {
  if (typeof window === 'undefined') {
    return { githubToken: '', aiApiKey: '' };
  }

  return {
    githubToken: window.localStorage.getItem(GITHUB_TOKEN_KEY) || '',
    aiApiKey: window.localStorage.getItem(AI_API_KEY_KEY) || '',
  };
}

export function saveStoredAccessKeys(keys: StoredAccessKeys): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (keys.githubToken.trim()) {
    window.localStorage.setItem(GITHUB_TOKEN_KEY, keys.githubToken.trim());
  } else {
    window.localStorage.removeItem(GITHUB_TOKEN_KEY);
  }

  if (keys.aiApiKey.trim()) {
    window.localStorage.setItem(AI_API_KEY_KEY, keys.aiApiKey.trim());
  } else {
    window.localStorage.removeItem(AI_API_KEY_KEY);
  }
}

export function clearStoredAccessKeys(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(GITHUB_TOKEN_KEY);
  window.localStorage.removeItem(AI_API_KEY_KEY);
}