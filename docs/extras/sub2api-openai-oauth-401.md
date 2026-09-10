# 一次看似刷新成功的 OpenAI OAuth 401

> 日期：2026-09-10  
> 作者：Eve.aic  
> 来源：一次 sub2api OpenAI OAuth 账号排障实录

今天为了测试一个与模型路由有关的问题，我把一个新加入号池的 OpenAI OAuth 账号单独拿了出来。请求还没测几轮，上游先回了：

```text
401 Provided authentication token is expired
code: token_expired
```

表面上只是 access token 过期，实际处理时却绕了一个小圈：第一次刷新后，数据库里已经出现了新的到期时间，账号请求仍然继续使用旧 token。于是有了这篇番外。

## 先分清是哪一种 401

这次碰到的是 `token_expired`，意味着 access token 过期，但账号仍保存着可用的 refresh token，可以尝试刷新。

另一个常见错误是 `token_revoked` 或 `invalidated oauth token`。它表示凭据已经被上游撤销，通常不能靠刷新恢复，只能重新走 OAuth 授权。二者都叫 401，处理方向完全不同。

## 第一步：刷新账号凭据

sub2api 提供了按账号刷新的管理接口：

```http
POST /api/v1/admin/openai/accounts/{account_id}/refresh
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{}
```

服务端会完成这些事情：

1. 确认目标是 OpenAI OAuth 账号。
2. 读取账号绑定的代理、refresh token 和 client ID。
3. 通过 OpenAI OAuth token 端点获取新凭据。
4. 回写新的 access token 与到期时间；上游未返回新 refresh token 时，保留旧值。

刷新请求也可能因为代理链路不稳定而失败。我第一次就遇到了 `TLS handshake timeout`。这种情况不能把“接口调用过”当成“刷新成功”，应当重试并核对 HTTP 状态、账号更新时间和新 token 的到期时间。

## 第二步：清掉旧运行态和缓存

刷新凭据成功后，账号仍可能保留先前 401 写入的 `error` 状态，也可能有旧 access token 缓存在 Redis。恢复接口会统一清理这些状态：

```http
POST /api/v1/admin/accounts/{account_id}/recover-state
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{}
```

它会按需清除错误、限流、过载和临时摘池状态，并让 OAuth token 缓存失效。下一次请求才能从数据库读取刚刷新的凭据。

所以这次真正有效的顺序是：

```text
确认错误码是 token_expired
-> 刷新账号 OAuth 凭据
-> 核对新到期时间
-> recover-state 清错误与 token 缓存
-> 再发最小请求验证
```

最终账号恢复为 active，新 token 的有效期延长到了 2026-09-20，旧的 401 和临时摘池状态也被清除。

## 为什么第一次看起来“刷新了”却还报 401

因为“数据库里有新 token”和“下一次请求一定使用新 token”不是一回事。账号曾经进入错误状态，缓存里也可能还留着旧 access token。只更新凭据、不清运行态和缓存，会得到一种很迷惑的半成功状态：管理页里的到期时间是新的，上游收到的却仍可能是旧 token。

另外，OAuth 刷新解决的只是认证问题。之后出现的 `502`、`503` 或 `429` 分别属于链路、上游过载或限流，不能继续算在 401 头上。排障时一次只验证一层，否则很容易把“认证已恢复”和“账号已完全可用”混为一谈。

## 源码位置

- `backend/internal/server/routes/admin.go:443-450`：OpenAI OAuth 刷新路由
- `backend/internal/handler/admin/openai_oauth_handler.go:231-292`：按账号刷新并回写凭据
- `backend/internal/service/openai_oauth_service.go:338-403`：读取代理与 refresh token、刷新并保留旧 refresh token
- `backend/internal/handler/admin/account_handler.go:1183-1210`：账号恢复接口
- `backend/internal/service/ratelimit_service.go:2057-2090`：清错误与可恢复运行态
- `backend/internal/service/token_cache_invalidator.go:23-68`：删除各平台 OAuth token 缓存

这次的结论很简单：OAuth 401 的修复不是“再点一次刷新”，而是先识别错误类型，再确保新凭据、账号状态和缓存三者一致。
