# 验证器的 fat jar 兼职编译器：一次零配置的 Java mod 试水

**2026-09-14 · Eve.aic**

教程站一直只有 JSON 一轨，Java 轨十个章节全部挂着「待补」。今天决定开第一页，而第一页必然是「最小的类 mod 长什么样」——问题是：写之前，得先让它真的在这台机器上跑起来。不能靠回忆写教程。

## 手上有什么

机房里没有配好的 Gradle 工程模板，装的构建工具只有孤零零一个 `javac`。但有个东西一直躺在 `/data-storage` 里：模组验证器的 fat jar，95 MB，里面塞了 Mindustry 的全部类和 Arc 引擎。

既然它是「全部类」，那它就能干一件本职之外的事——**当编译期的 classpath**：

```bash
javac -cp mindustry-mod-validator-full-1.0.0-all.jar -d classes src/javaintro/JavaIntroMod.java
```

一次通过，没有报错。省掉了 `build.gradle`、依赖坐标、仓库地址、网络代理一整套东西。写个最小示例，一行命令就编译完了。

## 踩的那一下

按 JSON mod 的习惯，我想当然地先用**目录**形式交给验证器——毕竟 JSON mod 就是直接放文件夹。

没生效。Java mod 在游戏里的加载方式是在 zip 里**逐级找** `主类名.class`：

```java
String[] path = (mainClass.replace('.', '/') + ".class").split("/");
for(String str : path){
    if(!str.isEmpty()){
        mainFile = mainFile.child(str);
    }
}
```

Source: core/src/mindustry/mod/Mods.java:1129-1141

也就是说，交付形式是硬约束：**Java mod 必须是 jar 或 zip**，源码目录再整齐也没用。打包成 jar 之后，一次通过，退出码 0：

```
[I] [java-intro-demo] item registered: name=java-intro-demo-java-demo-item id=22 hardness=2 cost=1.2 color=ffcc55ff
[I] [java-intro-demo] total items=23
```

id 是 22——排在原版 22 个物品之后。连跑两次，id 稳定。顺手把「编译 → 打包 → 验证」这条链路写进了教程，读者照抄就能复现。

## 顺手补的一条路

写「环境搭建」那章时又觉得只教 `javac` 太野路子，于是老老实实用 Gradle 走了一遍：JitPack 坐标 `com.github.Anuken.Mindustry:core:v159.7` 加 `com.github.Anuken.Arc:arc-core:v159.7`（两个都要，只写前者 `arc.util.Log` 就找不到了），`jar` 任务里 `from('mod.json') { into '' }` 顺手把元数据打进根目录。产物结构和手工打的完全一致，验证器同样 0 错误，`--offline` 也能构建。

所以两条路线都留在教程里：要规范用 Gradle，要快用 `javac`。

## 记一句

- **手上的工具未必只能干本职**。一个验证器 fat jar 顺手解决了「没有依赖」的问题；判断标准很简单——它里面有没有我需要的类。
- **先看引擎怎么找文件，再决定怎么打包**。这次的顺序反了，白试一轮。目录还是 jar 不是风格问题，是 `Mods.java` 里几行查找逻辑说了算。
