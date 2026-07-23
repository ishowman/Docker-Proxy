/**
 * 站点公开信息路由
 * 提供前端页脚等所需的「锁定站点信息」（GitHub 仓库地址等）。
 * 该信息在数据库中以 AES 加密存储且不可更改，此处仅做解密后下发。
 */
const express = require('express');
const router = express.Router();
const configServiceDB = require('../services/configServiceDB');

const DEFAULT_GITHUB_URL = 'https://github.com/dqzboy/Docker-Proxy';

// 公开接口：获取站点锁定信息（无需登录）
router.get('/', async (req, res) => {
  try {
    const githubUrl = (await configServiceDB.getLockedGithubUrl()) || DEFAULT_GITHUB_URL;
    res.json({
      githubUrl,
      year: new Date().getFullYear(),
      siteName: 'Docker 镜像加速服务'
    });
  } catch (error) {
    res.json({
      githubUrl: DEFAULT_GITHUB_URL,
      year: new Date().getFullYear(),
      siteName: 'Docker 镜像加速服务'
    });
  }
});

module.exports = router;
