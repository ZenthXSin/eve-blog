# 九、项目结构与开发


```
kt-annotations/
├── annotations/            # 注解定义（运行时依赖 io.eve.ktannot:annotations）
│   └── src/main/kotlin/io/eve/ktannot/Annotations.kt
├── buildSrc/               # Gradle 插件（Kotlin PSI 扫描 + 5 生成器）
│   ├── KtAnnotationsPlugin.kt
│   └── gen/  Scanner.kt Model.kt EntityGenerator.kt StructGenerator.kt
│            RemoteGenerator.kt LogicGenerator.kt RegionGenerator.kt
│            AssetsGenerator.kt TypeUtils.java
├── tests/                  # stub 单测模块（桩 arc/mindustry 依赖 + 3 个测试）
├── realmod/                # 真实 Mindustry v159.7 mod 验证模块
├── vanilla/                # 原版组件库 + 实体组装
├── cursedmod/              # 纯 hjson 演示 mod（未使用注解）
└── PLAN-P2..P6.md          # 各阶段设计文档
```

常用命令：

```bash
./gradlew build --no-daemon                          # 全量构建
./gradlew :tests:test --rerun-tasks                  # 强制重跑生成+编译+单测
./gradlew :annotations:publishToMavenLocal :buildSrc:publishToMavenLocal   # 发布到本地仓库
./gradlew :realmod:modJar                            # 打 mod jar
```

技术栈：Kotlin 2.2.0 / Gradle 8.11.1 / `kotlin-compiler-embeddable`（PSI 解析）/ `kotlinpoet-jvm 1.17.0`（代码生成）/ JDK 17。

> 构建时会出现 KGP 关于 `kotlin-compiler-embeddable` 出现在 build classpath 的警告——这是生成器使用 PSI 的预期代价，不影响构建结果。

