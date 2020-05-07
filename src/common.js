/**
 * TMD 封装不来
 * 一个个复制了
 */

/**
 * 是否在引号内。支持单引号和双引号
 */
export function isInQuote(left) {
    var mode = 0; // 0：不在引号中；1：单引号中；2：双引号中
    for (var i = 0; i < left.length; i++) {
        if (i > 0 && left[i - 1] === '\\') // 转义字符
            continue;
        if (left[i] === "'") {
            if (mode == 1) {
                mode = 0;
            } else if (mode == 0) {
                mode = 1;
            }
        } else if (left[i] === '"') {
            if (mode == 2) {
                mode = 0;
            } else if (mode == 0) {
                mode = 2;
            }
        }
    }
    return mode != 0;
}

module.exports = {
    isInQuote
};