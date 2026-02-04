# Auto Move File 插件 v3.0 改造完成

## ✅ 完成状态

所有任务已完成，插件已从 v2.2.0 升级到 v3.0.0。

---

## 📝 修改内容

### 1. 配置结构升级

**旧配置 (v2.2.0)**:
```javascript
{
  targetFolder: '笔记/自媒体文章笔记',
  watchFolder: '',
  keywords: '白鹿原',
  watchProperty: 'tags',
  publishedTag: '已发',
  pendingTag: '待发',
  delayTime: 2000
}
```

**新配置 (v3.0.0)**:
```javascript
{
  // 全局过滤（所有规则都要满足）
  watchFolder: '',
  keywords: '',
  delayTime: 2000,

  // 规则列表（按顺序匹配，只执行第一个）
  rules: [
    {
      id: 1,
      enabled: true,
      watchProperty: 'tags',
      triggerValue: '已发',
      targetFolder: '笔记/自媒体文章笔记',
      blockingValue: '待发'
    }
  ]
}
```

---

### 2. 核心逻辑改进

#### checkAndMoveFile 方法
- 支持遍历多个规则
- 每个规则可以指定不同的监控属性
- 支持数组和字符串两种属性类型
- 规则按顺序匹配，只执行第一个匹配的规则
- 支持阻止值功能

#### 移动逻辑
```javascript
文件修改
   ↓
[全局过滤] watchFolder + keywords
   ↓ 通过
[遍历规则]
   ↓ 规则1：检查 watchProperty 是否包含 triggerValue
   ↓ 匹配 + 没有 blockingValue
   → 移动到 targetFolder → 结束
```

---

### 3. UI 改进

#### 新增功能
1. **规则列表表格**
   - 显示所有规则
   - 每行显示规则详情
   - 支持复选框多选

2. **批量操作**
   - 删除选中规则
   - 禁用选中规则
   - 启用选中规则

3. **规则编辑模态框**
   - 监控属性
   - 触发值
   - 目标文件夹（带文件夹选择器）
   - 阻止值（可选）
   - 启用状态开关

4. **全局配置区**
   - 监控文件夹
   - 监控关键词
   - 延迟时间

---

### 4. 向后兼容

#### 自动迁移
旧版配置会自动迁移到新版格式：

```javascript
// 自动检测旧配置并迁移
if (savedSettings.targetFolder && !savedSettings.rules) {
  // 创建新规则
  rules: [{
    watchProperty: savedSettings.watchProperty || 'tags',
    triggerValue: savedSettings.publishedTag || '已发',
    targetFolder: savedSettings.targetFolder,
    blockingValue: savedSettings.pendingTag || '待发'
  }]
}
```

用户升级插件后，会自动看到"配置已自动迁移到 v3.0 格式"的通知。

---

## 🎯 使用示例

### 示例1: 多平台分发

**配置**:
```javascript
rules: [
  {
    watchProperty: 'tags',
    triggerValue: '已发-微信',
    targetFolder: '归档/微信',
    blockingValue: '待发'
  },
  {
    watchProperty: 'tags',
    triggerValue: '已发-小红书',
    targetFolder: '归档/小红书',
    blockingValue: '待发'
  },
  {
    watchProperty: 'tags',
    triggerValue: '已发-B站',
    targetFolder: '归档/B站'
  }
]
```

**文件1**:
```yaml
tags:
  - 自媒体文章笔记
  - 微信
  - 已发-微信
```
→ 移动到 `归档/微信`

**文件2**:
```yaml
tags:
  - 自媒体文章笔记
  - 小红书
  - 已发-小红书
```
→ 移动到 `归档/小红书`

---

### 示例2: 不同属性监控

**配置**:
```javascript
rules: [
  {
    watchProperty: 'tags',
    triggerValue: '已发',
    targetFolder: '归档/已发文章',
    blockingValue: '待发'
  },
  {
    watchProperty: 'status',
    triggerValue: 'published',
    targetFolder: '归档/已发布'
  },
  {
    watchProperty: 'form',
    triggerValue: '已提交',
    targetFolder: '归档/已提交表单'
  }
]
```

**文件1**:
```yaml
tags:
  - 已发
```
→ 移动到 `归档/已发文章`

**文件2**:
```yaml
status: published
```
→ 移动到 `归档/已发布`

**文件3**:
```yaml
form: 已提交
```
→ 移动到 `归档/已提交表单`

---

### 示例3: 阻止值生效

**配置**:
```javascript
rules: [
  {
    watchProperty: 'tags',
    triggerValue: '已发',
    targetFolder: '归档/已发',
    blockingValue: '待发'
  }
]
```

**文件1**:
```yaml
tags:
  - 已发
```
→ ✅ 移动到 `归档/已发`

**文件2**:
```yaml
tags:
  - 已发
  - 待发
```
→ ❌ 不移动（包含阻止值）

---

## 📦 文件清单

### 修改的文件
1. `manifest.json` - 版本号更新为 3.0.0
2. `main.js` - 核心逻辑和 UI 重构

### 新增的文件
1. `styles.css` - UI 样式表

### 工作计划
1. `.sisyphus/plans/auto-move-file-v3.md` - 详细的技术文档

### 测试文件
1. `测试文件-已发.md` - 测试 tags 触发
2. `测试文件-status.md` - 测试 status 触发
3. `测试文件-阻止值.md` - 测试阻止值

---

## 🚀 部署步骤

1. **重新加载插件**
   - 在 Obsidian 中打开插件设置
   - 找到 "Auto Move File"
   - 点击"重新加载"或重启 Obsidian

2. **检查配置迁移**
   - 如果是旧版用户，会看到"配置已自动迁移到 v3.0 格式"的通知
   - 打开插件设置页面，查看规则列表

3. **添加规则**
   - 点击"+ 添加新规则"按钮
   - 配置监控属性、触发值、目标文件夹等
   - 保存规则

4. **测试功能**
   - 使用提供的测试文件验证功能
   - 或使用自己的测试文件

---

## 🔍 调试方法

### 查看控制台日志
1. 按 `Ctrl+Shift+I` (Windows) 或 `Cmd+Option+I` (Mac) 打开开发者工具
2. 切换到 Console 标签
3. 修改文件后查看日志输出

### 关键日志
```
=== checkAndMoveFile called ===
File path: ...
File name: ...
  -> In watch folder (...): true/false
  -> Matches keywords (...): true/false
  -> Should monitor: true/false
  -> Checking rule 1...
  -> Property 'tags' (array): [...]
  -> Matches trigger (已发): true/false, Has blocking (待发): true/false
  -> Rule 1 matched! Moving to ...
=== checkAndMoveFile completed (moved) ===
```

---

## 📌 注意事项

1. **规则顺序重要**
   - 文件同时匹配多个规则时，只执行第一个
   - 将更具体的规则放在前面

2. **阻止值优先级**
   - 即使匹配触发值，如果有阻止值也不会移动

3. **属性类型**
   - 支持 `tags` (数组) 和 `status` (字符串)
   - 数组使用 `includes()` 检查
   - 字符串使用 `===` 精确匹配

4. **全局过滤**
   - 所有规则都要先通过全局过滤（watchFolder + keywords）

---

## ✨ 未来优化方向

1. **规则优先级**
   - 允许用户自定义规则优先级

2. **规则导入/导出**
   - 支持将规则导出为 JSON 文件
   - 方便在不同仓库间共享配置

3. **正则表达式支持**
   - 在 triggerValue 中支持正则表达式
   - 更灵活的匹配模式

4. **移动前确认**
   - 可选的移动前弹窗确认
   - 避免误操作

5. **日志记录**
   - 记录移动历史
   - 方便回溯和调试

---

## 🙏 作者信息

- **插件名称**: Auto Move File
- **版本**: v3.0.0
- **作者**: 小新空
- **微信公众号**: 小新空

---

**改造完成日期**: 2026-01-27
**工作计划**: `.sisyphus/plans/auto-move-file-v3.md`
