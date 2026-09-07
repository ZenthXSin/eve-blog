# 流体噪音效果 Shader 复刻（任意形状）

> Source: 2026-08-14 群聊「锈科院内部群」，fluid-shader-test 模组实战（引擎 v159.7）

把原版液体/气体的「噪音贴图动画」用实时 shader 复刻，并实现**绘制在任意形状贴图上**（原版只能用 size×size 规则矩形平铺）。当天完整跑通无头验证 + 真机 shader 编译修复。

## 原版流体效果到底是什么

- `renderer.fluidFrames[gas?1:0][frame]` 是**预烘焙的动画帧 PNG**（非手绘、非运行时噪音）。
- 基础模板单帧 `core/assets-raw/sprites/blocks/liquid/fluid.png`（32×32），在**构建期**由噪音函数逐像素生成 50 帧 `fluid-liquid-N` / `fluid-gas-N`。
- 生成逻辑：`tools/src/mindustry/tools/Generators.java:32-72`：
  - `gasFrame`（42-47）：`Simplex.rawTiled` 双层，`min + (1-min)*interpolated`
  - `liquidFrame`（60-65）：`Simplex.rawTiled` 双层，`min + (interpolated>=0.3 ? 1-min : 0)` 二值化
  - 主 `fluid(gas,x,y,frame)`（33-41）：min 阈值液体 0.84、气体 0.56
- 运行时引用链：`Renderer.java:132-140`（atlas.find）→ `LiquidBlock.drawTiledFrames`（`LiquidBlock.java:39-83`）→ `Drawf.liquid`（`Drawf.java:391-397`，纯 `Draw.rect` blit）→ `Draw.rect`。
- 动画靠 `liquid.getAnimationFrame()` 切帧（`Liquid.java:106-107`）。

**关键结论**：`drawTiledFrames` 是写死的「平铺贴图」，永远画规则矩形网格、被 padding 截断。要实现任意形状，必须**绕开它**，在自定义 block 的 `draw()` 里自绘 shader blit。

## 任意形状的实现思路

不碰 `renderer.fluidFrames`（全局替换会影响 Conduit/Router 等所有液体绘制）。在 `LiquidBlock` 子类的 `draw()` 里：

1. `Draw.shader(customShader)`
2. 设 uniform：`u_time`（替代切帧）、`u_amount`（水位 `liquids.currentAmount()/liquidCapacity`）、`u_liquidColor`、`u_gas`、`u_mask`
3. `Draw.rect(blockRegion, x, y)` 画一个全尺寸矩形（quad UV 0..1）
4. `Draw.flush()`（先刷批）→ `Draw.shader()`（卸载）

片段着色器内：

- **任意形状**：用方块自身 region 的 alpha 做 mask，`if(mask.a<0.5) discard;`
- **水位**：`if(v_uv.y/u_amount > 1.0) discard;`
- **流动**：`u_time` 做 sin/噪声扰动代替切帧

## Simplex 噪音的 GLSL 问题

`arc.util.noise.Simplex.rawTiled` 是 **Java 实现（4D simplex + cos/sin tiling），无官方 GLSL 版**。两种选择：

1. 用 3D hash-simplex 近似（Perlin 变体），视觉等价但**非像素级一致**；
2. 把 arc 的 tiled-simplex 全套搬进 GLSL（像素级一致，工作量大）。

当天验证结论：hash 近似与真实 `Simplex.rawTiled` 在液体阈值决策上高度一致（mean 差 0.14，30720 像素点），气体接近（mean 差 0.23）。肉眼对流动观感足够。

## 无头验证法（GLSL 数学无法真编译）

headless 无 GL 上下文，`new Shader()` 会 NPE。两种验证：

1. **guard**：`if(!Vars.headless) createShader()`，headless 跳过。
2. **数学比对**：把 GLSL 的噪音公式移植成 Java，与真实 `arc.util.noise.Simplex`（server jar 自带，可直接调用）逐像素比对，报告 mean/max 误差。这能在无头端证明 shader 数学与 vanilla 一致。

## 可复用代码骨架（uniform 配置）

```kotlin
// arc Shader 无 fetch() 返回 Uniform 对象；用 setUniformf/setUniformi(String,..)
fluidShader = Shader(vsText, fsText)
Draw.shader(fluidShader)
fluidShader.setUniformf("u_time", Time.time)
fluidShader.setUniformf("u_amount", build.liquids.currentAmount() / build.block.liquidCapacity)
fluidShader.setUniformf("u_liquidColor", ...)
fluidShader.setUniformi("u_mask", ...)  // 纹理槽
Draw.rect(build.block.region, build.x, build.y)
Draw.flush()
Draw.shader()
```

顶点着色器属性名：`a_position`/`a_texCoord0`/`a_color`，uniform `u_projTrans`/`u_trans`（与 `Draw.rect` 兼容）。

## 关键坑

- 顶点/片元 `varying` 名必须一致（拼错链接炸）。
- 顶点 `a_texCoord0` 和 `u_projTrans` 由 arc 默认注入，可显式声明为自包含。
- 从 jar mod 读 shader 文件必须逐段 `root.child("shaders").child("fluid.vert")`；单段 `child("shaders/fluid.vert")` 在 `ZipFi` 解析不到；`ZipFi.length()` 恒 0，用 `readString().length()`。

## 相关

- [Tile Shader 世界坐标方案](./tile-shader-world-coords) —— 顶点着色器传世界坐标 + 顶点颜色
