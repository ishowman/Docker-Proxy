/**
 * 菜单管理路由
 * 提供后台"菜单管理"页面所需接口：
 *  - GET  /api/menu/items   获取菜单项
 *  - POST /api/menu/items   保存菜单项（需登录）
 */
const express = require('express');
const router = express.Router();
const logger = require('../logger');
const { requireLogin } = require('../middleware/auth');
const configServiceDB = require('../services/configServiceDB');

/**
 * GET /api/menu/items
 * 公开接口（前台导航菜单也需读取）
 */
router.get('/items', async (req, res) => {
  try {
    const items = await configServiceDB.getMenuItems();
    res.json(items);
  } catch (e) {
    logger.error('获取菜单项失败:', e);
    res.status(500).json({ error: '获取菜单项失败', details: e.message });
  }
});

/**
 * POST /api/menu/items
 * 写入菜单项（需登录）
 */
router.post('/items', requireLogin, async (req, res) => {
  try {
    const { menuItems } = req.body || {};
    if (!Array.isArray(menuItems)) {
      return res.status(400).json({ error: '无效的菜单项数据', details: 'menuItems 必须是数组' });
    }
    await configServiceDB.saveMenuItems(menuItems);
    res.json({ success: true, message: '菜单项配置已保存' });
  } catch (e) {
    logger.error('保存菜单项失败:', e);
    res.status(500).json({ error: '保存菜单项失败', details: e.message });
  }
});

module.exports = router;
