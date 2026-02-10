# Auto Move File for Obsidian

[English](README.md) | **中文**

**官网**: [https://gitapp.net](https://gitapp.net) *(即将推出)*

### 📺 视频教程
- **YouTube**: [观看教程](https://youtu.be/VzaoMqYdZfk)
- **Bilibili**: [Obsidian自动整理插件：实现笔记自动归档，别再手动拖文件了！](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

**Made with ❤️ by 小新空**

---

## 简介

一个 Obsidian 插件，根据 frontmatter 或文件名规则自动移动/复制文件（或文件夹）。支持监控 `tags`、`status`、`category` 等属性与文件名匹配。

### 🚀 功能特性

- **自动移动/复制**：文件可移动或复制到目标目录
- **多规则监控（属性/文件名）**：每条规则可监控属性或文件名
- **灵活监控逻辑**：支持监控文件夹、关键词的 AND/OR 组合
- **自定义监控属性**：可监控 `tags`、`status`、`category` 等任意 frontmatter 属性
- **多种数据类型**：支持数组类型（如 `tags`）和字符串类型（如 `status`）
- **文件夹归档**：支持归档整个文件夹到目标目录
- **规则顺序**：规则按顺序匹配，命中第一个
- **文件夹选择器**：可视化选择目标文件夹
- **完美支持中文**：支持 Windows 路径和中文路径
- **可调延迟**：避免频繁触发，可自定义延迟时间

### 📦 安装

#### 方法一：手动安装

1. 下载仓库的文件
2. 解压到你的 Obsidian vault 的 `.obsidian/plugins/` 目录
3. 重启 Obsidian
4. 进入 **设置** → **社区插件**
5. 找到 **Auto Move File**，启用插件

#### 方法二：从 GitHub 安装

1. 下载 `main.js` 和 `manifest.json`
2. 将文件放入 `.obsidian/plugins/auto-move-file/` 目录
3. 重启 Obsidian 并启用插件

### 🎯 使用说明

#### 基本流程

1. 打开任意 Markdown 文件
2. 修改 frontmatter 属性或重命名文件以匹配规则
3. 保存文件（Ctrl + S）或完成重命名
4. 文件（或文件夹）自动移动/复制到目标目录

#### 配置示例

##### 示例 1：监控 tags（默认）

**Frontmatter：**
```yaml
---
tags: [待发, 文章]
---
```

**配置：**
- 监控属性：`tags`
- 已发标签：`已发`
- 待发标签：`待发`

**触发移动：** 将 `tags` 改为 `[已发]` 并保存

##### 示例 2：监控 status

**Frontmatter：**
```yaml
---
status: 待发
---
```

**配置：**
- 监控属性：`status`
- 已发值：`已发`
- 待发值：`待发`

**触发移动：** 将 `status` 改为 `已发` 并保存

##### 示例 3：监控文件名

**文件名：**
```
项目-已发.md
```

**配置：**
- 监控模式：`文件名`
- 文件名匹配：`已发`

**触发移动：** 重命名文件使其包含 `已发`

### ⚙️ 配置说明

1. **多规则**：可添加多条规则并排序
2. **监控模式**：选择属性监控或文件名监控
3. **监控属性**：选择要监控的 frontmatter 属性
4. **文件名匹配**：文件名需要包含的字符串
5. **移动/复制模式**：移动或复制到目标目录
6. **文件夹归档**：可归档整个源文件夹
7. **源文件夹**：选择要监控变化的文件夹
8. **目标文件夹**：选择移动/复制的目标目录
9. **延迟设置**：设置延迟毫秒数以避免频繁触发

### 🤝 支持

- **问题反馈**：在 GitHub 报告 bug
- **功能请求**：通过 GitHub Issues 提交建议
- **文档**：访问我们的网站查看详细指南

### 📄 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

如果你喜欢这个插件，请给个 Star ⭐
