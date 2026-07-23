/**
 * 资源指标历史路由
 * 由 routes/index.js 自动挂载到 /api/metrics
 */
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const metricsService = require('../services/metricsService');
const logger = require('../logger');

// 获取资源指标历史（近 N 小时，默认 24h，上限 720h）
router.get('/history', requireLogin, async (req, res) => {
  try {
    const hours = Math.min(720, Math.max(1, parseInt(req.query.hours, 10) || 24));
    const fromTs = Date.now() - hours * 3600 * 1000;
    const points = await metricsService.getHistory(fromTs);
    res.json({
      points,
      from: fromTs,
      to: Date.now(),
      hours,
      serverTime: Date.now()
    });
  } catch (e) {
    logger.error('获取指标历史失败:', e);
    res.status(500).json({ error: '获取指标历史失败', details: e.message });
  }
});

module.exports = router;
