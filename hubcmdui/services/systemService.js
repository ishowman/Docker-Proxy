/**
 * 系统服务模块 - 处理系统级信息获取
 *
 * 使用 systeminformation 库提供跨平台、准确的系统数据。
 * 本模块是「实时资源接口(/api/system-resources)」与「历史指标采集器(metricsService)」
 * 的唯一数据源，保证两者口径完全一致。
 *
 * 为什么不用 os 模块：
 *  - CPU：os.loadavg() 是「运行队列长度」，并非 CPU 占用率；真实占用必须用 si.currentLoad()
 *  - 内存：os.freemem() 把 Linux 可回收的 buff/cache 也算作「已用」，会严重夸大占用；
 *          si.mem() 的 used/available 才是真实口径
 *  - 磁盘 / 网络 / 温度：os 模块根本没有对应能力
 */
const si = require('systeminformation');
const os = require('os');
const logger = require('../logger');

// 预热：systeminformation 的 currentLoad 首次调用返回「自启动以来」的平均值，
// 这里先空打一次，使后续真实调用得到「采样间隔内」的 CPU 占用率。
si.currentLoad().catch(() => {});

// 网络流量计算：记录上一次总字节数，自行计算速率（避免 systeminformation 首次调用无基线导致为 0）
let lastNetSnapshot = null;

function aggregateNetworkStats(netStats) {
  // 排除回环网卡（lo/lo0），聚合其余所有网卡（en0、eth0、utun、docker 等）
  return (netStats || []).filter(n => {
    const iface = String(n.iface || '').toLowerCase();
    return iface !== 'lo' && !iface.startsWith('lo');
  });
}

function computeNetworkSpeed(netStats) {
  const now = Date.now();
  const interfaces = aggregateNetworkStats(netStats);
  const totalRx = interfaces.reduce((sum, n) => sum + (n.rx_bytes || 0), 0);
  const totalTx = interfaces.reduce((sum, n) => sum + (n.tx_bytes || 0), 0);

  let rxSec = 0;
  let txSec = 0;
  if (lastNetSnapshot && (now - lastNetSnapshot.ts) > 0) {
    const dt = (now - lastNetSnapshot.ts) / 1000; // 秒
    rxSec = Math.max(0, (totalRx - lastNetSnapshot.rx) / dt);
    txSec = Math.max(0, (totalTx - lastNetSnapshot.tx) / dt);
  }

  lastNetSnapshot = { ts: now, rx: totalRx, tx: totalTx };
  return { rxSec, txSec, interfaces: interfaces.map(n => n.iface) };
}

// 字节转可读单位
function formatBytes(bytes, decimals = 2) {
  if (bytes == null || isNaN(bytes) || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  try {
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  } catch (e) {
    return 'N/A';
  }
}

/**
 * 获取核心系统资源信息（CPU / 内存 / 磁盘 / 网络 / 温度）。
 * 全部基于 systeminformation，数值准确。
 */
async function getSystemResources() {
  try {
    logger.info('Fetching system resources using systeminformation...');
    const [cpuLoad, mem, fsSize, cpuInfo, osInfo, netStats, cpuTemp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpu(),
      si.osInfo(),
      si.networkStats().catch(() => []),
      si.cpuTemperature().catch(() => ({ main: null }))
    ]);

    // --- CPU ---
    const cpuUsage = typeof cpuLoad.currentLoad === 'number' ? +cpuLoad.currentLoad.toFixed(1) : null;
    const perCore = Array.isArray(cpuLoad.cpus) ? cpuLoad.cpus.map(c => +(+c.load).toFixed(1)) : [];
    const loadAvg = osInfo.platform !== 'win32' ? os.loadavg().map(l => +l.toFixed(2)) : null;
    const temp = (cpuTemp && typeof cpuTemp.main === 'number') ? +cpuTemp.main.toFixed(0) : null;

    const cpuData = {
      cores: cpuInfo.cores || os.cpus().length || 1,
      physicalCores: cpuInfo.physicalCores,
      model: (cpuInfo.manufacturer + ' ' + cpuInfo.brand).trim() || '未知',
      speed: cpuInfo.speed,
      usage: cpuUsage,            // 真实 CPU 占用率（%）
      perCore,                    // 每核负载（%）
      temp,                       // CPU 温度（°C），可能为 null
      loadAvg,                    // [1m,5m,15m] 仅作参考，不等于占用率
      load1: loadAvg ? loadAvg[0] : null
    };

    // --- 内存 ---
    const memUsedPct = mem.total > 0 ? +((mem.used / mem.total) * 100).toFixed(1) : null;
    const memAvailPct = (mem.total > 0 && typeof mem.available === 'number')
      ? +((mem.available / mem.total) * 100).toFixed(1) : null;
    const memData = {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available,
      wired: mem.wired,
      buffcache: mem.buffcache,
      usedPercentage: memUsedPct,       // 已用百分比（基于 used/total）
      availablePercentage: memAvailPct  // 真正可用百分比（含可回收缓存）
    };

    // --- 磁盘（选取挂载在 / 的主盘；Windows 取 C:）---
    let mainDisk = null;
    if (osInfo.platform === 'win32') {
      mainDisk = (fsSize || []).find(d => d.fs && d.fs.startsWith('C:'));
    } else {
      mainDisk = (fsSize || []).find(d => d.mount === '/');
    }
    if (!mainDisk && Array.isArray(fsSize) && fsSize.length) mainDisk = fsSize[0];

    const diskData = mainDisk ? {
      mount: mainDisk.mount,
      size: formatBytes(mainDisk.size),
      used: formatBytes(mainDisk.used),
      available: formatBytes(mainDisk.available),
      percent: (typeof mainDisk.use === 'number') ? mainDisk.use.toFixed(0) + '%' : 'N/A',
      usedPercentage: (typeof mainDisk.use === 'number') ? +mainDisk.use.toFixed(1) : null,
      usedBytes: mainDisk.used,
      sizeBytes: mainDisk.size
    } : {
      mount: 'N/A', size: 'N/A', used: 'N/A', available: 'N/A',
      percent: 'N/A', usedPercentage: null
    };

    // --- 网络吞吐（聚合所有非回环网卡 rx/tx，单位 bytes/sec）---
    const { rxSec, txSec, interfaces: netInterfaces } = computeNetworkSpeed(netStats);
    const networkData = {
      rxSec: +rxSec.toFixed(2),
      txSec: +txSec.toFixed(2),
      interfaces: netInterfaces
    };

    const resources = {
      osType: osInfo.platform,
      osDistro: osInfo.distro,
      cpu: cpuData,
      memory: memData,
      disk: diskData,
      network: networkData,
      system: {
        platform: osInfo.platform,
        release: osInfo.release,
        hostname: osInfo.hostname || os.hostname(),
        uptime: Math.floor(os.uptime())   // 秒（数字），由前端 formatUptime 格式化
      }
    };
    logger.info('Successfully fetched system resources (osType=' + resources.osType + ')');
    return resources;
  } catch (error) {
    logger.error('获取系统资源失败 (services/systemService.js):', error);
    throw new Error('Failed to get system resources: ' + error.message);
  }
}

module.exports = { getSystemResources };
