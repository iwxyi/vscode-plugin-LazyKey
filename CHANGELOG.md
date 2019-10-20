# Change Log

All notable changes to the "lazykey" extension will be documented in this file.

## [v0.0.2]

- Support `JavaSript`
- Add smarter `Enter` key with ignoring right parentheses and auto indentation
- Add smarter `Tab` key with skipping and inserting in a parameter list
- Hide suggest after point `->` if exists variable on the right
- Repair the case of `cout < <`
- Support more case like converting `qDebug(),,` to `qDebug() << `
- Auto detect whether `< >` or `" "` to be used after `#include` by space key
- Completely fix converting `9` / `0` to `()` twice
- Fix putting the current line in the code block bt `[`
- Add `{ }` at the end of the line beginning with `if/for/...`
- Auto indent when inserting `{ }` in a blank line

## [v0.0.1]

- Initial release