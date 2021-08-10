import * as core from '@actions/core'
import * as github from '@actions/github'
import lint from '@commitlint/lint'

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
const bodyRegex = /^(.|\n)*(\*{3})((.*|\n)*)$/
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

    await validatePrTitle(pullRequest.title)
    core.setOutput('commitText', getPRDescription(pullRequest.body))
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function validatePrTitle(title: string): Promise<void> {
  const result = await lint(title, {
    'type-enum': [2, 'always', ['fix', 'feature']]
  })

  if (!result.valid) {
    throw new Error(
      `Invalid PR title: ${result.errors.map(err => `\n- ${err.message}`)}`
    )
  }
}

function getPRDescription(prBody: string | null): string {
  if (prBody == null) {
    return ''
  }

  const groups = prBody.match(bodyRegex)

  if (groups == null) {
    return ''
  }

  return groups[3].replace(commentsPattern, '') ?? ''
}

run()
