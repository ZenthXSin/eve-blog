# Tile Shader 世界坐标方案（含顶点颜色）

> Source: 液体罐着色器 mod（liquid-tank-shader）实战 + v159.7 源码验证

## 问题

给 tile 渲染（如 `Drawf.liquid` / `Draw.rect`）套自定义着色器时，`v_texCoords` 是图集 UV，无法直接映射到世界坐标。

## 正确方案

利用 `Draw.draw()` 的自定义 Runnable 包裹逻辑：

1. 自定义顶点着色器（不用 `default.vert`），传递 `a_position.xy` 作为 `v_worldPos`
2. **必须同时传递 `a_color` 作为 `v_color`**！因为液面贴图（fluidFrames）是白色带透明的，液体颜色由 Java 端 `Draw.color()` 设置的顶点颜色（v_color）提供。若 vert 不传 a_color，输出就是白色
3. 片元着色器内先 `base * v_color` 上色，再叠加液体动画效果（蓝色调调制、噪声颜色替换等）
4. 仅做颜色调制（原色 `*` 系数 + 噪声颜色替换），不做 UV 偏移采样（避免图集走样）

## 关键代码（顶点着色器）

```glsl
attribute vec4 a_position;
attribute vec4 a_color;
attribute vec2 a_texCoord0;
varying vec4 v_color;
varying vec2 v_texCoords;
varying vec2 v_worldPos;
void main(){
    gl_Position = u_projTrans * a_position;
    v_texCoords = a_texCoord0;
    v_color = a_color;
    v_worldPos = a_position.xy;
}
```

片元着色器：

```glsl
vec4 base = texture2D(u_texture, v_texCoords);
vec4 tinted = base * v_color;  // 关键！用顶点颜色上色
// ... 后续动画效果都用 tinted
```

## 宏定义陷阱

GLSL `#define` 是文本替换，要加括号：

```glsl
// 错误：S2.g 展开为 vec3(132,169,79) / 255.0.g → 编译错误
#define S2 vec3(132.0, 169.0, 79.0) / 255.0
// 正确
#define S2 (vec3(132.0, 169.0, 79.0) / 255.0)
```

## 调试截图背景

验证器截图用 `FrameBuffer.begin(Color.clear)` 会得到透明背景，在 QQ 查看时透明显示为白色，会误以为「背景是白的」。调试用 `new Color(0.15f, 0.15f, 0.15f, 1f)` 深灰背景更清晰。