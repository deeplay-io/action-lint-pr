import * as core from '@actions/core'
import * as github from '@actions/github'
import lint from '@commitlint/lint'
import {QualifiedRules} from '@commitlint/types'
import {getCommitText} from './getCommitText'

const githubToken = process.env.GITHUB_TOKEN

async function run(): Promise<void> {
  if (!githubToken) {
    throw new Error('Missing github token. Check your env for GITHUB_TOKEN')
  }

  try {
    const configJson = core.getInput('config')

    let config: QualifiedRules

    if (configJson) {
      try {
        config = JSON.parse(core.getInput('config'))
      } catch (err) {
        throw new Error(`Failed to parse config json: ${err.message}`)
      }
    } else {
      config = {
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never'],
        'type-enum': [2, 'always', ['feat', 'chore']]
      }
    }

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

    const commitText = getCommitText(pullRequest.body, pullRequest.title)
    await validateCommitMessage(commitText, config)
    core.debug(commitText)
    core.setOutput('commitText', commitText)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function validateCommitMessage(
  commitMessage: string,
  config: QualifiedRules
): Promise<void> {
  const result = await lint(commitMessage, config)

  if (!result.valid) {
    throw new Error(
      `Invalid commit message: ${result.errors.map(
        err => `\n- ${err.message}`
      )}`
    )
  }
}

run()
