import { config } from "../../config";
import { GitHubAccount } from "../../github/github-account";
import { hash } from "../../hash";
import { fetchGitHubAccount } from "./fetch-github-account";

export type SyncWithHash = () => void;

export type AddAccount = (login: string) => Promise<void>;

export type ReplaceAccount = (oldAccountID: number, newAccount: GitHubAccount) => void;

export type RemoveAccount = (id: number) => void;

export type ToggleRepo = (accountID: number, repoID: number, include: boolean) => void;

export interface AppState {
  accounts: GitHubAccount[];
}

export class StateStore {
  public static mixin(obj: StateStore) {
    let store = new StateStore();
    obj.state = store.state;
    obj.syncWithHash = store.syncWithHash.bind(obj) as SyncWithHash;
    obj.addAccount = store.addAccount.bind(obj) as AddAccount;
    obj.replaceAccount = store.replaceAccount.bind(obj) as ReplaceAccount;
    obj.removeAccount = store.removeAccount.bind(obj) as RemoveAccount;
    obj.toggleRepo = store.toggleRepo.bind(obj) as ToggleRepo;

    // Immediately sync with the URL hash
    // HACK: Without setTimeout, the state doesn't update until AJAX fetches complete
    setTimeout(obj.syncWithHash, 0);   // tslint:disable-line:no-unbound-method

    // Re-sync with the hash anytime it changes
    hash.addEventListener("hashchange", obj.syncWithHash);   // tslint:disable-line:no-unbound-method
  }

  public state: AppState = {
    accounts: [],
  };

  // Just here to satisfy TypeScript
  public setState!: SetState<AppState>;

  /**
   * Syncs the app state with the URL hash
   */
  public syncWithHash() {
    let accounts: GitHubAccount[] = [];

    for (let login of config.accounts) {
      // Create a temporary account object to populate the UI
      // while we fetch the account info from GitHub
      let account = new GitHubAccount({
        login,
        name: login,
        loading: true,
      });

      // Asynchronously fetch the account info from GitHub
      // and replace this temporary account object with the real info
      // tslint:disable-next-line:no-floating-promises no-unbound-method
      fetchGitHubAccount(account, this.replaceAccount);

      accounts.push(account);
    }

    this.setState({ accounts });
  }

  /**
   * Adds a new GitHub account with the specified login to the accounts list,
   * and asynchronously fetches the account info from GitHub
   */
  public async addAccount(login: string) {
    // Does this account already exist
    let account = this.state.accounts.find(byLogin(login));

    if (account) {
      // The account already exists
      return;
    }

    // Create a temporary account object to populate the UI
    // while we fetch the account info from GitHub
    account = new GitHubAccount({
      login,
      name: login,
      loading: true,
    });

    // Add this account
    let accounts = this.state.accounts.slice();
    accounts.push(account);
    this.setState({ accounts });

    // Fetch the account info from GitHub
    // and replace this temporary account object with the real info
    // tslint:disable-next-line:no-unbound-method
    await fetchGitHubAccount(account, this.replaceAccount);
  }

  /**
   * Replaces the specified account in the accounts list with the given GitHub account object.
   */
  public replaceAccount(oldAccountID: number, newAccount: GitHubAccount) {
    let accounts = this.state.accounts.slice();

    // Remove the old account
    removeAccountByID(accounts, oldAccountID);

    // Just to ensure we don't accidentally add duplicate accounts,
    // remove the new account if it already exists
    removeAccountByID(accounts, newAccount.id);

    // Add the new account
    accounts.push(newAccount);

    // Sort the accounts so they're in the same order as the URL hash.
    // This makes it easy for users to hack the URL.
    let sortedAccounts: GitHubAccount[] = [];
    for (let login of config.accounts) {
      let index = accounts.findIndex(byLogin(login));
      if (index >= 0) {
        let [account] = accounts.splice(index, 1);
        sortedAccounts.push(account);
      }
    }

    // Append any additional accounts that aren't in the hash yet
    for (let account of accounts) {
      sortedAccounts.push(account);
      config.addAccount(account);
      hash.updateHash();
    }

    this.setState({ accounts: sortedAccounts });
  }

  /**
   * Removes the specified GitHub account from the accounts list
   */
  public removeAccount(id: number) {
    let accounts = this.state.accounts.slice();
    let { removed } = removeAccountByID(accounts, id);

    if (removed) {
      this.setState({ accounts });
      config.removeAccount(removed);
    }
  }

  /**
   * Toggles the "hidden" property of the specified GitHub repo
   */
  public toggleRepo(accountID: number, repoID: number, hidden: boolean) {
    let accounts = this.state.accounts.slice();
    let account = accounts.find(byID(accountID))!;
    let repo = account.repos.find(byID(repoID))!;
    repo.hidden = hidden;
    this.setState({ accounts });
    config.toggleRepo(account, repo, hidden);
  }
}


/**
 * Removes the account with the specified ID from the array.
 */
function removeAccountByID(accounts: GitHubAccount[], id: number) {
  let index = accounts.findIndex(byID(id));
  let removed: GitHubAccount | undefined;

  if (index >= 0) {
    removed = accounts.splice(index, 1)[0];
  }

  return { index, removed };
}

/**
 * Used to search an array for object with the specified "id" property
 */
function byID(id: number) {
  return (obj: { id: number }) => obj.id === id;
}

/**
 * Used to search an array for object with the specified "login" property
 */
function byLogin(login: string) {
  login = login.trim().toLowerCase();
  return (obj: { login: string }) => obj.login.trim().toLowerCase() === login;
}
