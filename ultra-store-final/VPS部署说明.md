# 低成本VPS部署说明

当前目标：RackNerd 1GB KVM VPS，Ubuntu 24.04 64位。尚未购买、尚无IP、尚未执行远端安装。官方购买页的主机费用不包括域名或独立备份存储。

本包使用Node应用容器和Caddy反向代理，不安装额外管理面板。只有80/443端口公开；应用10000端口只在专用容器网络内访问。应用以UID1000运行，容器根文件系统只读，数据库写入宿主机runtime/data。模拟支付在正式配置中关闭。

## 购买

入口：https://my.racknerd.com/index.php?rp=/store/special-promos/1-gb-kvm-vps-special

账期选Annually，核对21.99美元年付。系统选Ubuntu 24.04 64 Bit，配置保留Included，不购买CPU/内存升级。机房可先选Los Angeles DC03，实际访问质量需要用用户自己的大陆网络测试，尚未保证线路。不要购买Shared Hosting虚拟主机。

## 部署前

1. 获得服务器公网IP，确认SSH端口、可用系统和域名。不要把密码、私钥、恢复密钥或备份凭证发进聊天。
2. 在受控的本机生成独立部署SSH公钥并通过官方控制台添加，验证登录和主机指纹。保留官方控制台通道；先不关闭现有密码登录。
3. 在新服务器检查现有服务、监听端口、磁盘和内存；确认不会覆盖其他业务后安装Docker及Compose插件，参考Docker官方Ubuntu安装文档。
4. 设置防火墙时先放行实际SSH端口，再放行80/443。确认新的密钥SSH连接成功后，才考虑关闭密码登录。不要直接套用22端口后锁死自定义SSH端口。

## 数据迁移和启动

1. 上传本包到/opt/ultra-store，先检查无历史业务目录冲突；不覆盖任何已有数据库。
2. 域名A记录指向服务器IPv4。暂不启用CDN代理，核对无错误AAAA记录。
3. 从旧站下载最新加密备份和单独保管的恢复密钥。旧站暂停写入后取最终快照，避免迁移期间双站产生分叉订单。
4. 使用restore-backup.mjs恢复到新的空目录，完整性校验通过后作为runtime/data。恢复使旧登录会话和恢复码失效，身份验证器仍可使用；需重新生成恢复码。将runtime/data及其文件权限交给UID1000，恢复密钥.service-key保持仅该用户可读。
5. 复制.env.vps.example为.env，填写SITE_HOST。已有恢复数据库不需要再次注册管理员，不填写真实密码到配置文件。使用chmod 600限制.env权限。
6. 在服务器上依次验证 docker compose config --quiet、docker compose build、docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile。此时不会把新站宣称为已上线。
7. 验证容器网络172.30.85.0/24不与服务器现有网络冲突。执行docker compose up -d，检查应用健康、Caddy证书和公网HTTPS。
8. 登录后亲自绑定管理员身份验证器、保存新恢复码及备份恢复密钥，配置WebDAV异地备份并核对成功记录。执行docker compose exec -T app node outputs/account-server/preflight.mjs。

## 验收

- 未登录打开/admin/必须转到管理员登录，代理不能打开管理员数据接口。
- 域名HTTPS无证书警告；公开端口中不应出现10000、SQLite或管理面板。
- 比对迁移前后账号、卡密和订单数量；确认属于自己的进货价、库存和订单。
- 新生产配置不允许模拟支付或生成购买订单，直到另行接入真实支付。
- 验证容器重建后账号和数据库仍在、自动备份创建成功、异地副本能够在空目录恢复。
- 完成新站验收后再切换入口、关闭旧临时隧道。旧本机数据库和迁移快照保留作回退，不删除。

## 运行维护

Docker服务随服务器启动，容器异常退出后自动重启；日志限定轮转大小。每次更新先备份，再用新镜像替换；不运行docker compose down -v，不删除runtime/data或证书卷。主机系统和Docker的安全更新、磁盘余量与备份成功时间需持续维护。

配置文件已准备；当前电脑没有Docker运行环境，容器构建、Caddy证书、VPS防火墙和真实公网迁移必须在购买后的服务器验证，尚未声称完成。
