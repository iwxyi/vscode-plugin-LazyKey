# Change Log

All notable changes to the "lazykey" extension will be documented in this file.

## [v0.2.2]

- 优化 `@override`、`private:`、`}else{` 等换行
- 优化 `int*[3]` 这一类方括号
- 优化缩进空格和tab混合使用的情况下花括号的缩进
- 修复按9键不会自动插入右括号的问题



## [v0.2.1]

- 优化=使 `var_=` => `var -=`
- 优化后面后花括号时等号不跳转到末尾
- 优化 `++`、`--`、`==` 后面不弹出自动补全
- 字符串内禁用 `.`、`9`、`0` 的自动转换
- 修复类似 `f(a()+b())` 嵌套导致算法出现自循环
- 修复更多bug



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