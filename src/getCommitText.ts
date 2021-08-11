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

export function getCommitText(prBody: string | null, prTitle: string): string {
  if (prBody == null) {
    return prTitle
  }

  const groups = prBody.match(bodyRegex)

  if (groups == null || groups[1] == null) {
    return prTitle
  }

  const resultBody = groups[1]
    // remove markdown comments
    .replace(commentsPattern, '')
    // remove leading line breaks if present
    .replace(/^(\r\n|\r|\n)+/, '')
    // remove trailing line breaks if present
    .replace(/(\r\n|\r|\n)+$/, '')

  return `${prTitle}${resultBody.length > 0 ? `\n${resultBody}` : ''}`
}
