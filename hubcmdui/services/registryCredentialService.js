/**
 * Registry 凭证内部同步模块
 *
 * 设计背景（合并说明）：
 * 「代理管理」(GoProxy) 已支持为每个 registry 配置 Basic 认证（用户名/密码），
 * 但其管理端口返回的密码是脱敏的（********），hubcmdui 的搜索/标签服务无法
 * 直接复用。为避免出现「两套独立凭证入口」，本模块不再对外暴露 CRUD，
 * 而是在代理管理保存配置时，由 routes/goProxy.js 调用 syncFromGoProxyConfig，
 * 把其中 type=basic 且有用户名的认证「同步」进内部表；镜像搜索/标签查看的
 * token 流程通过 getPlainCredential 读取。
 *
 * 对外表现：用户只在一个地方（代理管理）配置访问凭证，实际代理拉取与搜索/
 * 标签查看两处同时生效 —— 无重复入口。
 *
 * 密码以 AES 加密存储（lib/cryptoUtil），仅内部 getPlainCredential 返回明文。
 */
const logger = require('../logger');
const database = require('../database/database');
const { encrypt, decrypt } = require('../lib/cryptoUtil');

/**
 * registry_id -> 候选域名（与 registrySearchService.REGISTRY_CONFIGS 的域名保持一致）。
 * 用于把 go-proxy 配置里的 registry（按 hosts / upstream 匹配）映射到 hubcmdui 的 registry_id。
 */
const REGISTRY_HOSTS = {
  'docker-hub': ['registry-1.docker.io', 'docker.io', 'hub.docker.com'],
  'ghcr':       ['ghcr.io'],
  'quay':       ['quay.io'],
  'gcr':        ['gcr.io', 'us.gcr.io', 'eu.gcr.io', 'asia.gcr.io', 'staging-k8s.gcr.io'],
  'k8s':        ['registry.k8s.io', 'k8s.gcr.io'],
  'mcr':        ['mcr.microsoft.com'],
  'elastic':    ['docker.elastic.co'],
  'nvcr':       ['nvcr.io']
};

function hostOf(url) {
  if (!url) return '';
  try { return new URL(url).host; } catch { return ''; }
}

/**
 * 根据一个 go-proxy registry 的 hosts / upstream，反查对应的 hubcmdui registry_id。
 * @returns {string|null}
 */
function resolveRegistryId(proxyReg) {
  const hosts = Array.isArray(proxyReg.hosts) ? proxyReg.hosts : [];
  const upstreamHost = hostOf(proxyReg.upstream);
  for (const [registryId, candidates] of Object.entries(REGISTRY_HOSTS)) {
    for (const cand of candidates) {
      const hit = hosts.some(h => h === cand || h.endsWith('.' + cand) || cand.endsWith('.' + h))
        || (upstreamHost && (upstreamHost === cand || upstreamHost.endsWith('.' + cand) || cand.endsWith('.' + upstreamHost)));
      if (hit) return registryId;
    }
  }
  return null;
}

/**
 * 同步代理管理配置中的 Basic 认证到内部凭证表。
 * 全量重建：先清空旧表，再按当前 go-proxy 配置写入所有 type=basic 且有用户名的认证。
 * @param {{registries:Array}} cfg go-proxy 配置对象
 */
async function syncFromGoProxyConfig(cfg) {
  const regs = (cfg && Array.isArray(cfg.registries)) ? cfg.registries : [];
  try {
    await database.run('DELETE FROM registry_credentials');
    const now = new Date().toISOString();
    let synced = 0;
    for (const r of regs) {
      const auth = r.auth || {};
      if (auth.type !== 'basic' || !auth.username) continue;
      const registryId = resolveRegistryId(r);
      if (!registryId) continue;
      const enc = auth.password ? encrypt(auth.password) : '';
      await database.run(
        'INSERT INTO registry_credentials (registry_id, username, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [registryId, auth.username || '', enc, now, now]
      );
      synced++;
    }
    logger.info(`已从代理管理同步 ${synced} 条 Registry 凭证到内部表`);
  } catch (e) {
    logger.error(`同步 Registry 凭证失败: ${e.message}`);
  }
}

/**
 * 内部使用：获取明文凭证（仅供 token 获取流程调用）
 * @param {string} registryId
 * @returns {Promise<{username:string,password:string}|null>}
 */
async function getPlainCredential(registryId) {
  try {
    const row = await database.get(
      'SELECT username, password FROM registry_credentials WHERE registry_id = ?',
      [registryId]
    );
    if (!row || !row.password) return null;
    return { username: row.username || '', password: decrypt(row.password) };
  } catch (e) {
    logger.error(`读取 Registry 明文凭证失败 (${registryId}): ${e.message}`);
    return null;
  }
}

module.exports = {
  syncFromGoProxyConfig,
  getPlainCredential
};
