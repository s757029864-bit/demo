# 境外部署测试版

这是已有商城的免费托管测试包，使用 Node.js 24，仅依赖 Node 内置模块。保留首页、代理中心、管理演示、使用说明与原有虚拟购买流程。

本次只是迁移托管。订单、库存和演示账号仍保存在访客自己的浏览器，跨域名不共享数据、跨设备不自动同步。网站未接入真实支付，也没有生产数据库和真实管理员权限；不能导入真实卡密或用于核实真实到账。

## Render 配置

- 服务类型：Web Service（不是 Static Site，以便明确选择服务器区域）
- 源仓库：https://github.com/s757029864-bit/demo
- 分支：main
- Root Directory：overseas-preview
- Runtime：Node
- Region：Singapore
- Instance Type：Free
- Build Command：npm run check && npm test
- Start Command：npm start
- Health Check Path：/healthz
- 环境变量：NODE_VERSION=24、NODE_ENV=production
- 自动部署：关闭；变更后手动发布已验证的提交。

通过 Render 工具直接创建时若没有 Root Directory 字段，可使用构建命令 `npm --prefix overseas-preview run check && npm --prefix overseas-preview test`、启动命令 `node overseas-preview/server.mjs`，效果相同。

也可以用仓库根目录的 render.yaml 创建 Blueprint。创建前核对只有一个免费 Web Service，没有数据库、磁盘或其他付费资源。如平台要求绑卡，请由账号所有者自行决定，不必向聊天提供卡号、登录密码或 API token。

免费服务会休眠，唤醒时首次打开可能较慢；免费额度和平台限制以账号控制台为准。大陆手机是否能稳定访问，需要使用实际手机与网络测试，不能仅凭服务器位于新加坡就保证。

创建成功后，使用平台返回的 HTTPS 服务地址。不得把示例服务名称自行拼成一个“已上线”的网址；以真实部署结果为准。

## 本地检查

在此目录执行：

```text
npm run check
npm test
npm start
```

默认监听 10000 端口，也接受平台提供的 PORT。健康检查返回明确的 demo 模式和 payments=disabled。

只提供 GET 和 HEAD。所有 /api/ 请求明确返回 503 DEMO_ONLY，避免把一个假的“付款成功接口”误认为真实支付验证。

静态目录以外的文件不能通过服务器访问；页面设置脚本哈希 CSP、禁止被嵌入、禁止浏览器向外部接口发送请求。开发者工具仍然可以修改本地演示数据，这些响应头不能替代服务端交易校验。

## 数据说明

新域名首次访问会使用新的独立浏览器演示数据，不会自动携带 GitHub Pages 上的旧订单。可使用 a 或 b，密码 123，重新体验代理拿货后再从商城购买。

## 正式营业前

需要另行建设经授权的服务端订单、库存、登录和支付验证，确认供货及商品规则，并选择适合真实业务的服务套餐。不能把免费托管成功等同于业务已获准经营或支付已获准接入。

官方参考：

- https://render.com/docs/regions
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/node-version
