import * as core from '@actions/core'
import * as github from '@actions/github'

const githubToken = process.env.GITHUB_TOKEN
/**
 * Regex ожидает текст вида:
 *
 * <Описание PRа для ревью>
 * ...
 * ...
 * ...
 * ***
 * <Часть, которая попадает в коммит.
 * Включает в себя описание коммита,
 * примечания и ссылку на задачу в трекере>
 */
const bodyRegex = /^.*\*{3}(.*)$/s
const commentsPattern = /(<!--.*?-->)|(<!--[\S\s]+?-->)|(<!--[\S\s]*?$)/g

async function run(): Promise<void> {
  if (!githubToken) {
    throw new Error('Missing github token. Check your env for GITHUB_TOKEN')
  }

  try {
    const client = github.getOctokit(githubToken)

    const contextPullRequest = github.context.payload.pull_request
    if (!contextPullRequest) {
      throw new Error(
        "This action can only be invoked in `pull_request_target` or `pull_request` events. Otherwise the pull request can't be inferred."
      )
    }

    const owner = contextPullRequest.base.user.login
    const repo = contextPullRequest.base.repo.name

    // The pull request info on the context isn't up to date. When
    // the user updates the title and re-runs the workflow, it would
    // be outdated. Therefore fetch the pull request via the REST API
    // to ensure we use the current title.
    const {data: pullRequest} = await client.rest.pulls.get({
      owner,
      repo,
      pull_number: contextPullRequest.number
    })

    const description = getPRDescription(pullRequest.body)
    core.debug(description)
    core.setOutput('commitText', description)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function getPRDescription(prBody: string | null): string {
  if (prBody == null) {
    core.debug('prBody is null')
    return ''
  }
  core.debug(prBody)

  const groups = prBody.match(bodyRegex)

  if (groups == null || groups[0] == null) {
    core.debug('PR has no description in valid format')
    return ''
  }

  return groups[0].replace(commentsPattern, '') ?? ''
}

run()
