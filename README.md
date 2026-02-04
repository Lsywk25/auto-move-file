# GitApp.net - Smart Note Organization for Obsidian / Obsidian 智能笔记整理插件

[English](#english) | [中文](#中文)

---

## English

### 🌟 Overview
GitApp.net is a powerful Obsidian plugin designed to automatically organize and archive your notes, eliminating the need for manual file management. Say goodbye to dragging files around manually!

**Website**: [https://gitapp.net](https://gitapp.net) *(Coming Soon)*

### 📺 Video Tutorials
- **YouTube**: [Watch Tutorial](https://youtu.be/VzaoMqYdZfk)
- **Bilibili**: [观看教程](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

### 🚀 Features
- **Automatic Note Organization**: Intelligently categorizes and moves notes based on content and metadata
- **Smart Archive System**: Automatically archives old or unused notes
- **Custom Rules**: Define your own organization rules and patterns
- **Batch Processing**: Handle multiple files simultaneously
- **Safe Operations**: Built-in backup and recovery mechanisms
- **Performance Optimized**: Minimal impact on Obsidian's performance

### 📦 Installation

#### Method 1: Community Plugin (Recommended)
1. Open Obsidian Settings
2. Navigate to **Community Plugins**
3. Disable **Safe Mode** if enabled
4. Click **Browse** and search for "GitApp.net"
5. Click **Install** and then **Enable**

#### Method 2: Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/your-username/gitapp-net/releases)
2. Extract the files to your vault's `.obsidian/plugins/gitapp-net/` directory
3. Reload Obsidian or restart the application
4. Enable the plugin in Settings → Community Plugins

#### Method 3: BRAT (Beta Reviewer's Auto-update Tool)
1. Install the BRAT plugin from Community Plugins
2. Add this repository: `your-username/gitapp-net`
3. The plugin will be automatically installed and updated

### ⚙️ Configuration

#### Basic Setup
1. Navigate to **Settings** → **GitApp.net**
2. Configure your organization rules:
   - **Source Folders**: Specify which folders to monitor
   - **Archive Location**: Set where organized files should go
   - **File Patterns**: Define naming conventions and categorization rules

#### Advanced Settings
```json
{
  "autoOrganize": true,
  "archiveAfterDays": 30,
  "sourcefolders": ["Daily Notes", "Inbox"],
  "archiveFolder": "Archive",
  "rules": [
    {
      "pattern": "*.md",
      "condition": "older than 30 days",
      "action": "move to archive"
    }
  ]
}
```

### 🎯 Usage

#### Auto-Organization
The plugin automatically monitors your specified folders and applies organization rules in real-time.

#### Manual Organization
- Use the command palette (`Ctrl/Cmd + P`)
- Search for "GitApp.net: Organize Notes"
- Select the command to manually trigger organization

#### Custom Rules
Create custom organization rules in the settings:
1. **File Age Rules**: Archive files older than X days
2. **Content-based Rules**: Organize based on tags, content, or metadata
3. **Folder-specific Rules**: Apply different rules to different folders

### 🔧 Commands
- `GitApp.net: Organize All Notes` - Manually trigger organization for all notes
- `GitApp.net: Archive Old Notes` - Archive notes based on age criteria
- `GitApp.net: Restore from Archive` - Restore archived notes
- `GitApp.net: Open Settings` - Quick access to plugin settings

### 📝 Examples

#### Daily Note Organization
```
Input: Daily Notes/2024-01-15.md (30 days old)
Rule: Archive daily notes older than 7 days
Output: Archive/Daily Notes/2024/01/2024-01-15.md
```

#### Tag-based Organization
```
Input: Note with #project tag
Rule: Move project notes to Projects folder
Output: Projects/project-note.md
```

### 🤝 Support
- **Website**: [https://gitapp.net](https://gitapp.net)
- **Issues**: Report bugs and request features on GitHub
- **Documentation**: Full documentation available at gitapp.net

### 📄 License
This project is licensed under the MIT License.

---

## 中文

### 🌟 概述
GitApp.net 是一个强大的 Obsidian 插件，专为自动整理和归档笔记而设计，让您告别手动文件管理的烦恼。不再需要手动拖拽文件！

**官网**: [https://gitapp.net](https://gitapp.net) *(即将推出)*

### 📺 视频教程
- **YouTube**: [观看教程](https://youtu.be/VzaoMqYdZfk)  
- **哔哩哔哩**: [Obsidian自动整理插件：实现笔记自动归档，别再手动拖文件了！](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

### 🚀 特性
- **自动笔记整理**: 基于内容和元数据智能分类和移动笔记
- **智能归档系统**: 自动归档旧的或未使用的笔记
- **自定义规则**: 定义您自己的整理规则和模式  
- **批量处理**: 同时处理多个文件
- **安全操作**: 内置备份和恢复机制
- **性能优化**: 对 Obsidian 性能影响最小

### 📦 安装

#### 方法 1: 社区插件 (推荐)
1. 打开 Obsidian 设置
2. 导航到 **社区插件**
3. 如果已启用，请禁用 **安全模式**
4. 点击 **浏览** 并搜索 "GitApp.net"
5. 点击 **安装** 然后 **启用**

#### 方法 2: 手动安装
1. 从 [GitHub Releases](https://github.com/your-username/gitapp-net/releases) 下载最新版本
2. 将文件解压到您的保险库的 `.obsidian/plugins/gitapp-net/` 目录
3. 重新加载 Obsidian 或重启应用程序
4. 在 设置 → 社区插件 中启用插件

#### 方法 3: BRAT (Beta测试者自动更新工具)
1. 从社区插件安装 BRAT 插件
2. 添加此仓库: `your-username/gitapp-net`
3. 插件将自动安装和更新

### ⚙️ 配置

#### 基础设置
1. 导航到 **设置** → **GitApp.net**
2. 配置您的整理规则:
   - **源文件夹**: 指定要监控的文件夹
   - **归档位置**: 设置整理后文件的存放位置
   - **文件模式**: 定义命名约定和分类规则

#### 高级设置
```json
{
  "autoOrganize": true,
  "archiveAfterDays": 30,
  "sourcefolders": ["Daily Notes", "Inbox"],
  "archiveFolder": "Archive",
  "rules": [
    {
      "pattern": "*.md",
      "condition": "older than 30 days", 
      "action": "move to archive"
    }
  ]
}
```

### 🎯 使用方法

#### 自动整理
插件自动监控您指定的文件夹，并实时应用整理规则。

#### 手动整理
- 使用命令面板 (`Ctrl/Cmd + P`)
- 搜索 "GitApp.net: Organize Notes"
- 选择命令手动触发整理

#### 自定义规则
在设置中创建自定义整理规则:
1. **文件年龄规则**: 归档超过 X 天的文件
2. **基于内容的规则**: 基于标签、内容或元数据进行整理
3. **文件夹特定规则**: 对不同文件夹应用不同规则

### 🔧 命令
- `GitApp.net: Organize All Notes` - 手动触发所有笔记的整理
- `GitApp.net: Archive Old Notes` - 基于年龄标准归档笔记
- `GitApp.net: Restore from Archive` - 从归档中恢复笔记
- `GitApp.net: Open Settings` - 快速访问插件设置

### 📝 示例

#### 日记整理
```
输入: Daily Notes/2024-01-15.md (30天前)
规则: 归档超过7天的日记
输出: Archive/Daily Notes/2024/01/2024-01-15.md
```

#### 基于标签的整理
```
输入: 带有 #项目 标签的笔记
规则: 将项目笔记移动到项目文件夹
输出: Projects/project-note.md
```

### 🤝 支持
- **官网**: [https://gitapp.net](https://gitapp.net)
- **问题反馈**: 在 GitHub 上报告错误和功能请求
- **文档**: 完整文档可在 gitapp.net 查看

### 📄 许可证
本项目采用 MIT 许可证。
