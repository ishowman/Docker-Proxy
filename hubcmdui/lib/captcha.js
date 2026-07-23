/**
 * 验证码工具
 * 生成随机、不易被自动识别的验证码（字母 + 数字混合，排除易混淆字符）。
 * 相比「算术题」验证码，随机字符更难被脚本直接计算，安全性更高。
 *
 * 设计要点：
 * - 使用 crypto.randomBytes 保证随机性（非 Math.random）。
 * - 字母表排除 0/O/1/l/I 等易混淆字符，提升用户可读性。
 * - 会话中只保存「标准答案」（统一大写），校验时大小写不敏感。
 */
const crypto = require('crypto');

// 安全字母表：排除 0/O/1/l/I 等易混淆字符（纯大写字母 + 数字）
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * 生成随机验证码
 * @param {number} length 验证码长度，默认 4
 * @returns {string} 大写验证码
 */
function generateCaptchaCode(length = 4) {
    const len = Math.max(1, parseInt(length, 10) || 4);
    const bytes = crypto.randomBytes(len);
    let code = '';
    for (let i = 0; i < len; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return code;
}

/**
 * 校验用户输入的验证码是否正确（大小写不敏感，自动去除首尾空格）
 * @param {string} expected 会话中保存的标准答案
 * @param {string} input 用户输入
 * @returns {boolean}
 */
function verifyCaptcha(expected, input) {
    if (!expected || typeof input !== 'string') return false;
    const a = String(expected).trim().toUpperCase();
    const b = input.trim().toUpperCase();
    return a.length > 0 && a === b;
}

module.exports = { ALPHABET, generateCaptchaCode, verifyCaptcha };
