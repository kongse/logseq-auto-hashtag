// ===== 2. index.js (主文件) =====
let keywordList = [];
let abbreviationMap = {}; // 新增：缩写映射
let isProcessing = false;
// 默认关键词列表
const defaultKeywords = [
  '项目管理', 'JavaScript', 'React', 'Vue', 'Python',
  '学习', '工作', '读书', '思考', '会议',
  '计划', '目标', '任务', '想法', '问题',
  'AI', '技术', '开发', '设计', '产品'
];

// 默认缩写映射
const defaultAbbreviations = {
  "do": "Docusaurus",
  "ob": "obsidian",
  "lo": "logseq",
  "js": "JavaScript",
  "ts": "TypeScript",
  "py": "Python"
};

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

// 新增：从配置中加载缩写映射
async function loadAbbreviations() {
  try {
    const abbreviationsData = await fetch('./abbreviations.json').then(r => r.json());
    abbreviationMap = abbreviationsData.abbreviations || defaultAbbreviations;
  } catch (error) {
    console.log('使用默认缩写映射');
    abbreviationMap = defaultAbbreviations;
  }
}

// 新增：处理缩写替换
function processAbbreviations(text) {
  if (!text || Object.keys(abbreviationMap).length === 0) return text;
  
  let processedText = text;
  
  // 按缩写长度降序排序，优先匹配长缩写
  const sortedAbbreviations = Object.keys(abbreviationMap).sort((a, b) => b.length - a.length);
  
  sortedAbbreviations.forEach(abbr => {
    const fullForm = abbreviationMap[abbr];
    // 匹配缩写：前面不是字母，后面是空格、标点或结尾
    const regex = new RegExp(`(?<!\\w)${escapeRegExp(abbr)}(?=\\s|[.,!?;:"'()\\[\\]{}]|$)`, 'g');
    
    processedText = processedText.replace(regex, (match, offset, string) => {
      // 检查前面是否已经有 # 或 [[
      const before = string.substring(Math.max(0, offset - 3), offset);
      if (before.includes('#') || before.includes('[[')) {
        return match; // 不替换
      }
      console.log('替换缩写:', match, '->', fullForm);
      return fullForm;
    });
  });
  
  return processedText;
}

// 修改：处理文本，添加标签
function processText(text) {
  console.log('原始文本:', text);
  console.log('关键词列表:', keywordList);
  console.log('缩写映射:', abbreviationMap);
  
  if (!text) return text;
  
  let processedText = text;
  
  // 第一步：处理缩写替换
  processedText = processAbbreviations(processedText);
  
  // 第二步：处理关键词标签
  if (keywordList.length > 0) {
    // 按关键词长度降序排序
    const sortedKeywords = [...keywordList].sort((a, b) => b.length - a.length);
    
    // 记录已经被匹配的位置范围，防止重复匹配
    const matchedRanges = [];
    
    sortedKeywords.forEach(keyword => {
      // 每次都创建新的正则表达式对象，避免状态污染
      let regex;
      
      // 检查是否为纯英文关键词
      if (/^[a-zA-Z]+$/.test(keyword)) {
        // 纯英文关键词：使用单词边界
        regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'g');
      } else {
        // 非英文关键词（中文、数字、混合等）：不使用单词边界
        regex = new RegExp(escapeRegExp(keyword), 'g');
      }
      
      let match;
      const replacements = [];
      
      // 使用 while 循环找到所有匹配位置
      while ((match = regex.exec(processedText)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        // 检查前面是否已经有 # 或 [[
        const before = processedText.substring(Math.max(0, start - 3), start);
        if (before.includes('#') || before.includes('[[')) {
          continue; // 跳过已有标签的匹配
        }
        
        // 检查这个位置是否已经被更长的关键词匹配过
        const isOverlapping = matchedRanges.some(range => 
          (start >= range.start && start < range.end) || 
          (end > range.start && end <= range.end) ||
          (start <= range.start && end >= range.end)
        );
        
        if (!isOverlapping) {
          replacements.push({ start, end, match: match[0] });
          matchedRanges.push({ start, end });
        }
        
        // 防止无限循环：如果匹配长度为0，手动推进位置
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
      
      // 从后往前替换，避免位置偏移
      replacements.reverse().forEach(replacement => {
        console.log('匹配到关键词:', replacement.match);
        const before = processedText.substring(0, replacement.start);
        const after = processedText.substring(replacement.end);
        processedText = before + `#${replacement.match} ` + after;
      });
      
      // 显式清理：重置正则表达式状态（虽然每次都是新对象，但保险起见）
      regex.lastIndex = 0;
      regex = null; // 帮助垃圾回收
    });
  }
  
  console.log('处理后文本:', processedText);
  return processedText;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        3. 或使用快捷键 <code>Ctrl+J</code> (Mac: Cmd+J)<br>
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
// 解析关键词设置
function parseKeywords(settingsText) {
  if (!settingsText) return defaultKeywords;
  return settingsText.split('\n').filter(line => line.trim()).map(line => line.trim());
}

// 解析缩写设置
function parseAbbreviations(settingsText) {
  if (!settingsText) return defaultAbbreviations;
  
  const result = {};
  settingsText.split('\n').forEach(line => {
    const [key, value] = line.split('=').map(s => s.trim());
    if (key && value) {
      result[key] = value;
    }
  });
  return result;
}

// 在main函数中使用
function main() {
  console.log('🏷️ Auto Hashtag Plugin 已加载');
  
  keywordList = parseKeywords(logseq.settings?.keywords);
  abbreviationMap = parseAbbreviations(logseq.settings?.abbreviations);
  
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
  
  // 注册快捷键命令（修复 process 错误）
  logseq.App.registerCommandPalette({
    key: 'auto-hashtag-process',
    label: '🏷️ Auto Hashtag: 处理当前块',
    keybinding: {
      mode: 'global',
      binding: navigator.platform.toLowerCase().includes('mac') ? 'cmd+shift+h' : 'ctrl+shift+h'
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
  // 修改设置架构，使用正确的数据类型
logseq.useSettingsSchema([
  {
    key: 'keywords',
    type: 'string',  // 改为string类型
    inputAs: 'textarea',
    title: '关键词列表',
    description: '每行一个关键词',
    default: defaultKeywords.join('\n')
  },
  {
    key: 'abbreviations',
    type: 'string',  // 改为string类型
    inputAs: 'textarea', 
    title: '缩写映射',
    description: '格式：缩写=完整词语，每行一个',
    default: Object.entries(defaultAbbreviations).map(([k,v]) => `${k}=${v}`).join('\n')
  }
]);
}

// 插件入口
logseq.ready(main).catch(console.error);

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 创建防抖的处理函数
const debouncedProcess = debounce(async () => {
  if (isProcessing) return;
  
  isProcessing = true;
  
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
    console.error('Auto Hashtag 处理错误:', error);
    logseq.UI.showMsg('处理失败', 'error');
  } finally {
    isProcessing = false;
  }
}, 150); // 150ms 防抖

// 注册快捷键
logseq.App.registerCommandPalette({
  key: 'auto-hashtag-process',
  label: '🏷️ Auto Hashtag: 处理当前块',
  keybinding: {
    mode: 'global',
    binding: navigator.platform.toLowerCase().includes('mac') ? 'cmd+j' : 'ctrl+j'
  }
}, debouncedProcess);

