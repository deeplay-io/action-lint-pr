import {getCommitText} from '../src/getCommitText'
import {expect, test} from '@jest/globals'

const title = 'feat: test test test'
const body1 = `Test-test-test
test test
- [] do smth
- [x] test
<!--Коммент-->
***
KEY-42
<!--Коммент-->
## Примечания
<!--Коммент-->
Тест-тест-тест`
const body2 = ''
const body3 = `
- [] test
- [] bla-bla

## Примечания

`
const body4 = `
bla-bla

KEY-42



## Примечания
      Тест-тест-тест

***
<!--Коммент-->
<!--Коммент-->
`
const body5 = '\n'
const body6 = '\r'
const body7 = '\r\n'
const body8 = `
Тест

***





KEY-42
<!--Коммент-->
`

test('getCommitText matches snapshots', async () => {
  expect(getCommitText(body1, title)).toMatchSnapshot()
  expect(getCommitText(body2, title)).toMatchSnapshot()
  expect(getCommitText(body3, title)).toMatchSnapshot()
  expect(getCommitText(body4, title)).toMatchSnapshot()
  expect(getCommitText(body5, title)).toMatchSnapshot()
  expect(getCommitText(body6, title)).toMatchSnapshot()
  expect(getCommitText(body7, title)).toMatchSnapshot()
  expect(getCommitText(body8, title)).toMatchSnapshot()
})
