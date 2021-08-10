import * as core from '@actions/core'
import * as github from '@actions/github'
import lint from '@commitlint/lint'
import load from '@commitlint/load'
import {ParserOptions, QualifiedConfig} from '@commitlint/types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@commitlint/config-conventional')

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
    const file = core.getInput('configPath', {required: true})
    const cwd = process.env.GITHUB_WORKSPACE
    const config = await load({}, {file, cwd})
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

    await validatePrTitle(pullRequest.title, config)
    const description = getCommitText(pullRequest.body, pullRequest.title)
    core.debug(description)
    core.setOutput('commitText', description)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function validatePrTitle(
  title: string,
  {rules, parserPreset}: QualifiedConfig
): Promise<void> {
  const parserOpts = parserPreset.parserOpts as ParserOptions | undefined
  const result = await lint(title, rules, {parserOpts})

  if (!result.valid) {
    throw new Error(
      `Invalid PR title: ${result.errors.map(err => `\n- ${err.message}`)}`
    )
  }
}

function getCommitText(prBody: string | null, prTitle: string): string {
  if (prBody == null) {
    core.debug('prBody is null')
    return prTitle
  }
  core.debug(prBody)

  const groups = prBody.match(bodyRegex)

  if (groups == null || groups[0] == null) {
    core.debug('PR has no description in valid format')
    return prTitle
  }

  return `${prTitle}\n${groups[0].replace(commentsPattern, '')}` ?? ''
}

run()
