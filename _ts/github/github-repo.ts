import { Dependencies } from "../package-registry/dependencies";

/**
 * A GitHub repository, as returned from the GitHub REST API
 */
export interface GitHubRepoPOJO {
  name: string;
  full_name: string;
  description?: string;
  archived: boolean;
  fork: boolean;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string;
  html_url: string;
}

/**
 * Additional GitHub repo properties that we need for this app
 */
export class GitHubRepo implements GitHubRepoPOJO {
  public name = "";
  public full_name = "";
  public description = "";
  public login!: string;
  public archived = false;
  public fork = false;
  public forks_count = 0;
  public stargazers_count = 0;
  public watchers_count = 0;
  public open_issues_count = 0;
  public open_pulls_count = 0;
  public issues_includes_pulls = true;
  public language = "";
  public html_url = "";
  public dependencies = new Dependencies();

  /**
   * The date/time that the repo's data was last fetched from GitHub
   */
  public last_refresh = new Date(0);

  /**
   * The date/time that the repo's PR count was last fetched from GitHub
   */
  public last_pull_count_refresh = new Date(0);

  public constructor(props: Partial<GitHubRepo>) {
    if (!props.login) {
      throw new Error(`No parent account was specified for GitHub repo "${props.name}"`);
    }

    // Handle JSON deserialization
    // tslint:disable-next-line:strict-type-predicates
    if (typeof props.last_refresh === "string") {
      props.last_refresh = new Date(props.last_refresh);
    }

    Object.assign(this, props);
  }
}

// tslint:disable:no-any no-unsafe-any
export function isGitHubRepoPOJO(repo: any): repo is GitHubRepoPOJO {
  return repo &&
    typeof repo === "object" &&
    typeof repo.name === "string" &&
    repo.name.length > 0 &&
    typeof repo.full_name === "string" &&
    repo.full_name.length > 0 &&
    typeof repo.html_url === "string";
}
