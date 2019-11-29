# Change Log

All notable changes to the "lazykey" extension will be documented in this file.

## [v0.1.2]

- Predict point variable's name
- Support fill function's `()` according the whole file
- Add `()` after `foreach` when pressing space key



## [v0.1.1]

- Support block comment
- Not complete `)` when inserting '(' while having text on the right
- Make `]` jumping more intelligent
- Distinguish function parameters while complete `()`
- Not complete `()` after function names while right is `(`


## [v0.1.0]

- Auto fill `()` while inserting completion
- Convert `.` to `->` support any functions
- Add semicolon after `class` / `struct` / `enum`
- Fix `enter` key jumping to line end in the line only with comment or `)` / `}` / `]`
- Add spaces before and after the `=` forcibly
- Fix `0` not enabled


## [v0.0.5]

- Fix digital decimal point
- Fix the problem of `-`
- Fix multiple points `->`
- Add unequal of `getVal()1=`
- Add outdent of double `;` after an `if` line
- Auto oudent after `break;` if necessary
- Prevent indentation in switch fragment
- Prevent `9` and `0` in cases like `0.9`/`0.01`
- Support multidimensional array by using `[` key
- Convert the dot to a pointer according to the context


## [v0.0.4]

- Add auto generate variable name
- Don't affect the code in comment/quote/RegExp
- Fix `0` can't be entered in some cases
- Fix the `=` in the cases of `var a1=` and `if (a1=)`


## [v0.0.3]

- Convert `''` to `""` without shift key
- Jump `'` and `"`, but can't input them together
- Auto indentation support more like `public:` and `#include`
- Limit the range of effect languages
- Fix inserting a line after `return a;`
- Support single line comment `//`
- Support multiple line comment `/* */` and auto insert `*`


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