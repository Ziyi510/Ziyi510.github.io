# 访客地图部署

使用 Cloudflare Workers + D1，与参考站的技术方案一致。地图和计数属于本站，数据库从零开始；不连接参考站接口，不导入其历史记录。GitHub Pages 继续托管主页，Worker 通过自己的 `workers.dev` 地址提供统计接口，无须购买域名。

## 当前配置

- Worker：`ziyi510-visitors`
- 接口地址：`https://ziyi510-visitors.yzy23072018.workers.dev`
- D1：`ziyi510-visitors`，绑定名称 `DB`
- 允许计数的站点：`https://ziyi510.github.io`

数据库和接口地址已配置在仓库中。已有数据库无须重复创建。

## 重新部署

```sh
cd /Users/ziyi/Documents/Ziyi510.github.io/worker
npx wrangler@4 login --device --scopes account:read user:read workers:write workers_scripts:write d1:write
npx wrangler@4 deploy
```

## 为其他账号首次部署

在自己的 Cloudflare 账号完成登录后，在此目录运行：

```sh
cd /Users/ziyi/Documents/Ziyi510.github.io/worker
npx wrangler@4 login
npx wrangler@4 d1 create ziyi510-visitors
```

将返回的数据库 UUID 填到 `wrangler.toml` 的 `database_id`，然后运行：

```sh
npx wrangler@4 d1 execute ziyi510-visitors --remote --file schema.sql
npx wrangler@4 deploy
```

将输出的 `https://ziyi510-visitors.<account-subdomain>.workers.dev` 填入站点 `_config.yml` 的 `visitor_map_api_url`。重新构建并发布主页后，打开正式网址，检查 `/api/visit` 返回 204、`/api/visitors` 返回统计 JSON。

## 计数方式

- 每次正式网站加载计一次浏览；同一浏览器每 24 小时最多请求计一次地点访问。清理浏览器存储或使用另一浏览器会重新计数，因此不是严格的独立人数。
- 本地预览只读取，不增加浏览量。接口未配置时显示现有底图；请求失败会明确提示统计暂不可用。
- 使用 Cloudflare 提供的城市级地理位置；不存原始 IP。此版本未包含参考站额外的中国 IP 地理库，城市定位可能有偏差。
- 浏览量接口校验网站 Origin，过滤常见机器人；Origin 和浏览器标记可被伪造，计数不用于审计或计费。
- 公开接口只提供汇总数据，访问记录不会包含姓名或浏览器标识。

## 检查

```sh
node --test worker.test.mjs
node --check ../assets/js/visitor-map.js
```

更换账号时，先更新数据库 ID 和接口地址，再部署后端并发布主页。
