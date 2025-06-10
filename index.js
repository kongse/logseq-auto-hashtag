// ===== 2. index.js (主文件) =====
let keywordList = [];

// 默认关键词列表
const defaultKeywords = [
  '项目管理', 'JavaScript', 'React', 'Vue', 'Python',
  '学习', '工作', '读书', '思考', '会议',
  '计划', '目标', '任务', '想法', '问题',
  'AI', '技术', '开发', '设计', '产品'
];

// 从配置中加载关键词
async function loadKeywords() {
  try {
    const keywordsData = await fetch('./keywords.json').then(r => r.json());
    keywordList = keywordsData.keywords || defaultKeywords;
  } catch (error) {
    console.log('使用默认关键词列表');
    keywordList = defaultKeywords;
  }
}

// 处理文本，添加标签
function processText(text) {
  if (!text || keywordList.length === 0) return text;
  
  let processedText = text;
  
  // 按关键词长度降序排序，优先匹配长词，避免短词覆盖长词
  const sortedKeywords = [...keywordList].sort((a, b) => b.length - a.length);
  
  sortedKeywords.forEach(keyword => {
    // 创建正则表达式：
    // (?<!#) - 负向后顾：前面不是#
    // (?<!\[\[) - 负向后顾：前面不是[[
    // \b - 词边界
    // (?!\]\]) - 负向前瞻：后面不是]]
    // \b - 词边界
    const regex = new RegExp(`(?<!#)(?<!\
$$
\\[)\\b(${escapeRegExp(keyword)})\\b(?!\
$$
\\])`, 'gi');
    
    processedText = processedText.replace(regex, (match) => {
      // 检查匹配的词是否已经在标签或链接中
      return `#${match} `;
    });
  });
  
  return processedText;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\__CODE_BLOCK_0__');
}

// 显示设置界面
async function showSettings() {
  const currentKeywords = keywordList.join('\n');
  
  const html = `
    <div style="padding: 20px;">
      <h3>Auto Hashtag 设置</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">
          关键词列表（每行一个）:
        </label>
        <textarea 
          id="keywords-textarea" 
          style="width: 100%; height: 300px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;"
          placeholder="请输入关键词，每行一个&#10;例如：&#10;JavaScript&#10;React&#10;项目管理"
        >${currentKeywords}</textarea>
      </div>
      <div style="margin-bottom: 15px;">
        <button id="save-keywords" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          保存
        </button>
        <button id="reset-keywords" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          重置为默认
        </button>
        <button id="close-settings" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          关闭
        </button>
      </div>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 4px; font-size: 14px;">
        <strong>使用说明：</strong><br>
        1. 修改关键词后点击"保存"<br>
        2. 在编辑块中输入文本后，使用 <code>/Auto Hashtag</code> 命令<br>
        3. 或使用快捷键 <code>Ctrl+Shift+H</code> (Mac: Cmd+Shift+H)<br>
        4. 关键词会自动转换为 #标签 格式
      </div>
    </div>
  `;
  
  const rect = document.querySelector('#app')?.getBoundingClientRect();
  const modal = Object.assign(document.createElement('div'), {
    innerHTML: html,
    style: `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      max-width: 500px;
      width: 90%;
    `
  });
  
  document.body.appendChild(modal);
  
  // 绑定事件
  modal.querySelector('#save-keywords').onclick = () => {
    const textarea = modal.querySelector('#keywords-textarea');
    const newKeywords = textarea.value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    keywordList = newKeywords;
    logseq.updateSettings({ keywords: newKeywords });
    logseq.UI.showMsg('关键词已保存！', 'success');
    document.body.removeChild(modal);
  };
  
  modal.querySelector('#reset-keywords').onclick = () => {
    const textarea = modal.querySelector('#keywords-textarea');
    textarea.value = defaultKeywords.join('\n');
  };
  
  modal.querySelector('#close-settings').onclick = () => {
    document.body.removeChild(modal);
  };
  
  // 点击外部关闭
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

// 主函数
function main() {
  console.log('🏷️ Auto Hashtag Plugin 已加载');
  
  // 从设置中加载关键词
  const savedKeywords = logseq.settings?.keywords;
  if (savedKeywords && Array.isArray(savedKeywords)) {
    keywordList = savedKeywords;
  } else {
    keywordList = defaultKeywords;
  }
  
  // 注册斜杠命令
  logseq.Editor.registerSlashCommand('Auto Hashtag', async () => {
    try {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) {
        logseq.UI.showMsg('请先选择一个块', 'warning');
        return;
      }
      
      const originalContent = block.content;
      const processedContent = processText(originalContent);
      
      if (originalContent !== processedContent) {
        await logseq.Editor.updateBlock(block.uuid, processedContent);
        logseq.UI.showMsg('✅ 已添加标签！', 'success');
      } else {
        logseq.UI.showMsg('没有找到匹配的关键词', 'info');
      }
    } catch (error) {
      console.error(error);
      logseq.UI.showMsg('处理失败，请检查控制台', 'error');
    }
  });
  
  // 注册快捷键命令
  logseq.App.registerCommandPalette({
    key: 'auto-hashtag-process',
    label: '🏷️ Auto Hashtag: 处理当前块',
    keybinding: {
      mode: 'global',
      binding: process.platform === 'darwin' ? 'cmd+shift+h' : 'ctrl+shift+h'
    }
  }, async () => {
    try {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) {
        logseq.UI.showMsg('请先选择一个块', 'warning');
        return;
      }
      
      const originalContent = block.content;
      const processedContent = processText(originalContent);
      
      if (originalContent !== processedContent) {
        await logseq.Editor.updateBlock(block.uuid, processedContent);
        logseq.UI.showMsg('✅ 已添加标签！', 'success');
      } else {
        logseq.UI.showMsg('没有找到匹配的关键词', 'info');
      }
    } catch (error) {
      console.error(error);
      logseq.UI.showMsg('处理失败，请检查控制台', 'error');
    }
  });
  
  // 注册设置命令
  logseq.App.registerCommandPalette({
    key: 'auto-hashtag-settings',
    label: '🏷️ Auto Hashtag: 设置关键词'
  }, showSettings);
  
  // 添加工具栏按钮
  logseq.App.registerUIItem('toolbar', {
    key: 'auto-hashtag-toolbar',
    template: `
      <a class="button" data-on-click="showAutoHashtagSettings" title="Auto Hashtag 设置">
        <span style="font-size: 16px;">🏷️</span>
      </a>
    `
  });
  
  // 绑定工具栏点击事件
  logseq.provideModel({
    showAutoHashtagSettings: showSettings
  });
  
  // 注册设置项
  logseq.useSettingsSchema([
    {
      key: 'keywords',
      type: 'object',
      title: '关键词列表',
      description: '用于自动添加标签的关键词',
      default: defaultKeywords
    }
  ]);
}

// 插件入口
logseq.ready(main).catch(console.error);

