import { GitHubAccount, GitHubAccountKey, isGitHubAccountPOJO } from "../github/github-account";
import { GitHubRepo, GitHubRepoKey, isGitHubRepoPOJO } from "../github/github-repo";
import { JsonPOJO, POJO } from "../util";

interface CachedGitHubAccount {
  account: GitHubAccount;
  repoNames: string[];
}

const jsonDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Caches data to LocalStorage, so we can render the page immediately on subsequent visits,
 * rather than waiting for all data to be fetched from GitHub, David-DM, etc.
 * This also helps protect against API rate limits, since we can fallback to cached data.
 */
export class Cache {
  /**
   * Returns the specified GitHub Account from the cache, if it exists.
   * The account is fully re-hydrated, including its repos.
   */
  public getAccount({ login }: GitHubAccountKey): GitHubAccount | undefined {
    let { account, repoNames } = (getItem(login) || {}) as unknown as CachedGitHubAccount;

    if (isGitHubAccountPOJO(account)) {
      account = new GitHubAccount(account);

      if (Array.isArray(repoNames)) {
        // Load the account's GitHub repos as well
        for (let full_name of repoNames) {
          let repo = this.getRepo({ login, full_name });
          if (repo) {
            account.repos.push(repo);
          }
        }
      }

      return account;
    }
  }

  /**
   * Stores the specified GitHub Account and its repos in the cache.
   */
  public setAccount(account: GitHubAccount): void {
    let cachedAccount: CachedGitHubAccount = {
      account: {
        ...account,
        error: undefined,
        repos: [],
      },
      repoNames: [],
    };

    for (let repo of account.repos) {
      cachedAccount.repoNames.push(repo.full_name);
      this.setRepo(repo);
    }

    setItem(account.login, cachedAccount);
  }

  /**
   * Returns the specified GitHub Repo from the cache, if it exists.
   * The repo is fully re-hydrated, including its dependencies.
   */
  public getRepo({ full_name }: GitHubRepoKey): GitHubRepo | undefined {
    let cachedRepo = getItem(full_name);

    if (isGitHubRepoPOJO(cachedRepo)) {
      let repo = new GitHubRepo(cachedRepo);
      return repo;
    }
  }

  /**
   * Stores the specified GitHub Repo in the cache.
   */
  public setRepo(repo: GitHubRepo): void {
    setItem(repo.full_name, repo);
  }
}

/**
 * Returns the parsed value of the specified LocalStorage item
 */
function getItem(key: string): JsonPOJO | undefined {
  try {
    key = key.trim().toLowerCase();
    let json = localStorage.getItem(key);

    if (json) {
      return JSON.parse(json, reviver) as JsonPOJO;
    }
    else {
      return undefined;
    }
  }
  catch (error) {
    console.error(`Error loading ${key} from LocalStorage cache`, error);
    return undefined;
  }
}

/**
 * Sets the value of the specified LocalStorage item
 */
function setItem(key: string, value: POJO): void {
  key = key.trim().toLowerCase();
  let json = JSON.stringify(value);
  localStorage.setItem(key, json);
}

/**
 * Deserializes date strings when parsing JSON
 */
function reviver(key: string, value: unknown): unknown {
  if (typeof value === "string" && jsonDatePattern.test(value)) {
    value = new Date(value);
  }

  return value;
}
