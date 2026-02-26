**Made with ❤️ by Jituo Workshop**

# Auto Move File

**English** | [中文](README.md)

**Website**: [https://gitapp.net](https://gitapp.net)

An Obsidian plugin that automatically moves or copies files to specified directories based on frontmatter properties or filenames. Supports multiple rules, multiple property monitoring, and flexible target folder configuration.

## 🚀 Features

- **Auto Move/Copy Files**: Automatically move or copy files based on frontmatter properties or filenames
- **Multi-Rule Management**: Support for adding multiple rules, executed in order of matching
- **Rule Sorting**: Support for adjusting rule order via buttons, affecting execution priority
- **Monitoring Mode Switching**: Support for property monitoring and filename monitoring modes
- **Execution Priority Mode**: Choose between rule order or property value order for priority
- **Real-Time Monitoring Toggle**: Enable/disable real-time monitoring; when disabled, only manual button triggers work
- **Flexible Time Settings**: Support for milliseconds/seconds/minutes delay time units
- **Custom Monitoring Properties**: Can monitor any frontmatter property such as `tags`, `status`, `category`
- **Multiple Data Types**: Support for array types (e.g., `tags`) and string types (e.g., `status`)
- **Folder Archiving**: Support for archiving entire folders to target directories
- **Scan Scope Settings**: Manually trigger scanning of specific folders only
- **Folder Selector**: Visual selection of target folders
- **Full Chinese Support**: Supports Windows paths and Chinese paths

## 📦 Installation

### Method 1: Manual Installation

1. Download the files from the repository
2. Extract to your Obsidian vault's `.obsidian/plugins/` directory
3. Restart Obsidian
4. Go to **Settings** → **Community Plugins**
5. Find **Auto Move File** and enable the plugin

### Method 2: Install from GitHub

1. Download `main.js`, `manifest.json`, and `styles.css`
2. Place files in `.obsidian/plugins/auto-move-file/` directory
3. Restart Obsidian and enable the plugin

## 🎯 Usage

### Basic Workflow

1. Open plugin settings and add rules
2. Configure monitoring properties, trigger values, target folders, etc.
3. Save settings
4. Modify file frontmatter properties or filenames to match rules
5. Files automatically move/copy to target directories

### Global Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Watch Folder | Only monitor files in specified folder (empty = entire vault) | Empty |
| Keywords | Keywords that filenames must contain (empty = ignore, comma-separated for multiple) | Empty |
| Delay Time | Delay before checking after file modification | `2000` |
| Delay Time Unit | Milliseconds(ms)/Seconds(s)/Minutes(min) | `ms` |
| Scan Folder | Folder to scan when manually triggered (empty = entire vault) | Empty |
| Execution Priority Mode | By rule order / By property value order | `By rule order` |
| Real-Time Monitoring | Enable/disable auto-trigger | `Enabled` |

### Rule Configuration

| Setting | Description |
|---------|-------------|
| Watch Mode | Property monitoring / Filename monitoring |
| Watch Property | Frontmatter property name to monitor (e.g., `tags`, `status`) |
| Trigger Value | Trigger archiving when property contains this value |
| Blocking Value | Do not move if property also contains this value |
| Target Folder | Target path for file movement |
| Folder Archive Mode | Archive entire folder (instead of single file) |
| Copy Mode | Copy file instead of moving (keep original) |
| Enabled Status | Enable/disable this rule |

### Configuration Examples

#### Example 1: Monitor tags

**Frontmatter:**
```yaml
---
tags: [draft, article]
---
```

**Rule Configuration:**
- Watch Property: `tags`
- Trigger Value: `published`
- Blocking Value: `draft`

**Trigger:** Change `tags` to `[published]` and save

---

#### Example 2: Monitor status

**Frontmatter:**
```yaml
---
status: draft
---
```

**Rule Configuration:**
- Watch Property: `status`
- Trigger Value: `published`

**Trigger:** Change `status` to `published` and save

---

#### Example 3: Monitor filename

**Filename:**
```
project-published.md
```

**Rule Configuration:**
- Watch Mode: `Filename`
- Filename Contains: `published`

**Trigger:** Triggered when filename contains `published`

---

#### Example 4: Multi-Rule Priority

**Rule 1 (Order 1):**
- Watch Property: `tags`
- Trigger Value: `published-wechat`
- Target Folder: `archive/wechat`

**Rule 2 (Order 2):**
- Watch Property: `tags`
- Trigger Value: `published`
- Target Folder: `archive/general`

**File:**
```yaml
tags: [published-wechat, published]
```
→ Moved to `archive/wechat` (Rule 1 priority)

## ⚙️ Execution Priority Explanation

### By Rule Order (Default)

Priority is determined by the order of rules in the list. Rules listed first have higher priority.

**Use Case**: When you need precise control over which rule matches first

### By Property Value Order

Priority is determined by the order of properties defined in frontmatter. Rules corresponding to properties defined earlier in the file execute first.

**Use Case**: When file properties themselves have priority meaning

**Example:**
```yaml
status: completed
tags: [published]
```
- Rule 1: Monitor `tags` = `published`
- Rule 2: Monitor `status` = `completed`

→ Triggers Rule 2 (because `status` appears first in frontmatter)

## 🔧 Quick Commands

- **Check and Move Current File**: Check if currently open file meets move conditions
- **Check and Move All Files**: Check all matching files and batch move them

## ❓ FAQ

### Q: Files not moving automatically?

**A:** Please check:
1. Is real-time monitoring enabled?
2. Is file within watch folder (if set)?
3. Does filename contain keywords (if set)?
4. Is the rule enabled?
5. Are frontmatter property values correct?
6. Does it contain blocking values?

### Q: How to adjust rule priority?

**A:** In the rule list, click the ⬆️ or ⬇️ buttons on the right side of the rule to adjust order. Rules listed first have higher priority (when priority mode is set to "By rule order").

### Q: How to only trigger manually without auto-archiving?

**A:** Turn off the "Real-Time Monitoring" switch. When disabled, file modifications won't auto-trigger; you can only trigger via the "Check All Files" button.

### Q: How to debug the plugin?

**A:** Open Obsidian's Developer Tools (Ctrl + Shift + I), check the Console tab for detailed plugin logs.

## 📝 Changelog

### v3.1.0
- ✅ Added real-time monitoring toggle
- ✅ Added delay time unit selection (ms/s/min)
- ✅ Added scan folder setting (for manual triggering)
- ✅ Added execution priority mode switching (rule order/property value order)
- ✅ Added rule up/down move functionality
- ✅ Optimized folder selector with real-time updates
- ✅ Author info updated to "Jituo Workshop"

### v3.0.0
- ✅ Support for multi-rule management
- ✅ Support for property monitoring and filename monitoring
- ✅ Support for folder archive mode
- ✅ Support for batch rule operations

### v2.4
- ✅ Added custom monitoring property feature
- ✅ Support for array and string types

## 👨‍💻 Author

**Jituo Workshop**

Website: [https://gitapp.net](https://gitapp.net)

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests welcome!

If you like this plugin, please give it a Star ⭐

---