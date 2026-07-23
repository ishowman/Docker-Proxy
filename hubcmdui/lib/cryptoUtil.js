/**
 * 站点锁定信息加解密工具
 *
 * 用途：将「GitHub 仓库地址」等需要落库且不可更改的站点信息，以 AES-256-CBC
 * 加密后存入数据库，避免明文直接暴露在 db 文件中。
 *
 * 说明（务必知悉的边界）：
 *  - 对称加密的密钥随应用一起分发，这里的「加密」目标是「数据库静态加密 + 应用可控解密」，
 *    即落库为密文、且前端/后台均无法修改该值（接口层拒绝写入 _lock_ 前缀键）。
 *  - 它不是用于「对外保密」的——因为该地址本身就是公开页脚链接。
 *  - 密钥优先级：环境变量 SITE_LOCK_SECRET > 内置固定密钥常量。
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

const SECRET = process.env.SITE_LOCK_SECRET || 'DQZBOY-DOCKER-PROXY-SITE-LOCK-2026';
// 固定派生 32 字节密钥
const KEY = crypto.createHash('sha256').update(String(SECRET), 'utf8').digest();

/**
 * 加密明文，返回 `ivHex:dataHex` 形式字符串
 * @param {string} plainText
 * @returns {string}
 */
function encrypt(plainText) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final()
  ]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * 解密 `ivHex:dataHex` 形式密文
 * @param {string} payload
 * @returns {string} 解密后的明文，失败返回空串
 */
function decrypt(payload) {
  if (!payload || typeof payload !== 'string' || !payload.includes(':')) return '';
  try {
    const [ivHex, dataHex] = payload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return '';
  }
}

module.exports = { encrypt, decrypt, ALGORITHM };
