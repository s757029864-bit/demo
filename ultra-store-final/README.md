# 奥特曼商城 · VPS部署包

默认使用已选定的RackNerd 1GB VPS。请先阅读 [VPS部署说明](VPS部署说明.md)。compose.yaml、Caddyfile和.env.vps.example为本次配置；render.yaml仅为备用方案，不需要开通Render。

# 奥特曼商城 · 非支付项部署包

已实现：服务器库存闭环、角色隔离、买方账号与恢复密钥、跨设备订单、演示售后、已展示卡密作废、持久化限流、定时到期释放、管理员TOTP与一次性恢复码、AES-GCM加密备份及恢复校验。

默认关闭模拟付款。没有真实支付接口，不能据此真实收款发卡。

## 部署
Render Blueprint 配置为新加坡单实例 0.5c-512mb 与1GB持久磁盘，属于收费资源，未创建或扣费。先确认费用与账单状态，再使用此配置。单SQLite进程，不启用多实例扩容。不要把它作为纯静态站上传。

Node 24，无依赖安装。运行 node outputs/account-server/preview.mjs。容器使用非root用户；挂载目录必须允许UID1000写入。Render提供RENDER_EXTERNAL_URL时自动作为HTTPS来源；其他主机需配置PUBLIC_ORIGIN。

## 迁移现有数据
1. 旧站暂停写入，在管理员账号页创建并下载最新加密备份，单独导出恢复密钥。不要提交到Git，也不要发到聊天里。
2. 在离线空目录恢复：node outputs/account-server/restore-backup.mjs --backup BACKUP.enc --key-file RECOVERY.key --out NEW_EMPTY_DIRECTORY。
3. 将恢复目录作为DATA_DIR挂载到新服务。恢复会退出所有会话，并清空旧的一次性恢复码；身份验证器仍保留，登录后应重新生成/绑定恢复方案。保留旧数据目录作为回退。
4. ADMIN_REGISTRATION_HASH在托管平台秘密设置中填写。全新空库才允许一次管理员注册；不要公开bootstrap.json。
5. 管理员亲自启用双重验证并保存恢复码；配置独立WebDAV备份目录或同步目录，确认异地成功记录。恢复密钥须另外离线保管。
6. 设置NODE_ENV=production、正式HTTPS地址、持久DATA_DIR及DEMO_PAYMENTS_ENABLED=false，运行 node outputs/account-server/preflight.mjs。检查未通过不可宣称正式就绪。

## 备份与恢复
启动时及每6小时生成加密一致性SQLite快照，保留最近56份。复制至BACKUP_MIRROR_DIR，或HTTPS PUT上传至预先创建的WebDAV目录。此处的“已配置”不等于云端同步完成，后台显示最后成功时间和失败状态。未提供备份账户时，只完成服务器内加密备份。

恢复工具只接受空目录并检查SQLite完整性，拒绝覆盖运行中的数据库。备份不包含加密密钥本身，丢失密钥无法解密。

## 验证
node --test outputs/account-server/*.test.mjs

当前准备包尚未部署为独立长期服务。没有生产环境的容器构建、持久磁盘权限、域名与数据迁移验收记录，需要部署后逐项验证。
