import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Image as AntdImage,
  Input,
  List,
  message,
  Modal,
  Select,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useEffect, useRef, useState } from 'react';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface ChatAttachment {
  uid: string;
  name: string;
  size: number;
  type?: string;
  previewUrl?: string;
  originalName?: string;
  originalSize?: number;
  converted?: boolean;
  convertedName?: string;
  convertedSize?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  response_id?: string; // OpenAI响应ID，用于会话状态管理
  usage?: Usage; // token用量信息
  generation_time?: number; // 生成时间（毫秒）
  attachments?: ChatAttachment[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  provider:
    | 'openai'
    | 'claude'
    | 'gemini'
    | 'zhipu'
    | 'qwen'
    | 'doubao'
    | 'kimi'
    | 'deepseek';
  model: string;
  contextCurrentOnly?: boolean;
}

interface Models {
  openai: Array<{ value: string; label: string }>;
  claude: Array<{ value: string; label: string }>;
  gemini: Array<{ value: string; label: string }>;
  zhipu: Array<{ value: string; label: string }>;
  qwen: Array<{ value: string; label: string }>;
  doubao: Array<{ value: string; label: string }>;
  kimi: Array<{ value: string; label: string }>;
  deepseek: Array<{ value: string; label: string }>;
}

const Chat: React.FC = () => {
  // 对话会话相关状态
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // 输入和交互状态
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // AI配置状态
  const [provider, setProvider] = useState<
    'openai' | 'claude' | 'gemini' | 'zhipu' | 'qwen' | 'doubao' | 'kimi' | 'deepseek'
  >('openai');
  const [model, setModel] = useState('gpt-4.1');
  const [convertToWebp, setConvertToWebp] = useState(true);
  const [models, setModels] = useState<Models>({
    openai: [],
    claude: [],
    gemini: [],
    zhipu: [],
    qwen: [],
    doubao: [],
    kimi: [],
    deepseek: [],
  });
  const [enableStream, setEnableStream] = useState(false); // 流式输出开关，默认为否
  const [enableDeepThinking, setEnableDeepThinking] = useState(false); // 深度思考开关，默认为否
  const [contextCurrentOnly, setContextCurrentOnly] = useState(false); // 上下文仅当前开关，默认为否

  // UI状态
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 获取可用模型
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await request('/api/chat/models');
        if (response.success) {
          setModels(response.data);
        }
      } catch (error) {
        message.error('获取模型列表失败');
      }
    };
    fetchModels();
  }, []);

  // 从localStorage加载对话历史
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setChatSessions(sessions);

      // 如果有会话，自动选中最新的一个
      if (sessions.length > 0) {
        const latestSession = sessions.sort(
          (a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt,
        )[0];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
        setProvider(latestSession.provider);
        setModel(latestSession.model);
        setContextCurrentOnly(latestSession.contextCurrentOnly ?? false);
      }
    }
  }, []);

  // 保存对话历史到localStorage
  const saveSessions = (sessions: ChatSession[]) => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
    setChatSessions(sessions);
  };

  // 自动滚动到底部
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  // 生成对话标题
  const generateChatTitle = (firstMessage: string): string => {
    const maxLength = 20;
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned;
  };

  // 新建对话
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provider: 'openai',
      model: 'gpt-4.1',
      contextCurrentOnly: false,
    };

    const updatedSessions = [newSession, ...chatSessions];
    saveSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setProvider('openai');
    setModel('gpt-4.1');
    setFileList([]);
    setInputValue('');
  };

  const beginRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const commitRename = () => {
    if (!editingSessionId) return;
    const trimmedTitle = editingTitle.trim();
    const nextTitle = trimmedTitle || '新对话';
    const updatedSessions = chatSessions.map((session) =>
      session.id === editingSessionId
        ? { ...session, title: nextTitle, updatedAt: Date.now() }
        : session,
    );
    saveSessions(updatedSessions);
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  // 切换对话
  const switchToChat = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setProvider(session.provider);
      setModel(session.model);
      setContextCurrentOnly(session.contextCurrentOnly ?? false);
      setFileList([]);
    }
  };

  // 更新当前对话
  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) return;

    const updatedSessions = chatSessions.map((session) => {
      if (session.id === currentSessionId) {
        const updatedSession = {
          ...session,
          messages: newMessages,
          updatedAt: Date.now(),
        };

        // 如果是第一条消息，更新标题
        if (session.messages.length === 0 && newMessages.length > 0) {
          updatedSession.title = generateChatTitle(newMessages[0].content);
        }

        // 更新AI配置
        updatedSession.provider = provider;
        updatedSession.model = model;
        updatedSession.contextCurrentOnly = contextCurrentOnly;

        return updatedSession;
      }
      return session;
    });

    saveSessions(updatedSessions);
    setMessages(newMessages);
  };

  // 删除对话
  const deleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个对话吗？此操作不可撤销。',
      onOk: () => {
        const updatedSessions = chatSessions.filter((s) => s.id !== sessionId);
        saveSessions(updatedSessions);

        // 如果删除的是当前对话，切换到其他对话或创建新对话
        if (sessionId === currentSessionId) {
          if (updatedSessions.length > 0) {
            const latestSession = updatedSessions[0];
            setCurrentSessionId(latestSession.id);
            setMessages(latestSession.messages);
            setProvider(latestSession.provider);
            setModel(latestSession.model);
          } else {
            createNewChat();
          }
        }
      },
    });
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() && fileList.length === 0) {
      message.warning('请输入消息或上传文件');
      return;
    }

    // 如果没有当前会话，创建一个新的
    if (!currentSessionId) {
      createNewChat();
      // 等待状态更新，然后重新调用发送
      setTimeout(() => handleSend(), 100);
      return;
    }

    setLoading(true);

    try {
      const processedAttachments: ChatAttachment[] = [];
      const formData = new FormData();

      // 处理文件（包含可选的WebP转换）
      for (const file of fileList) {
        if (!file.originFileObj) continue;
        const originalFile = file.originFileObj as File;
        let fileToSend: File = originalFile;
        let previewTarget: File | undefined = originalFile;
        let convertedInfo: Partial<ChatAttachment> = {};

        if (convertToWebp && isImageFile(originalFile)) {
          try {
            const webpFile = await convertImageToWebp(originalFile);
            fileToSend = webpFile;
            previewTarget = webpFile;
            convertedInfo = {
              converted: true,
              convertedName: webpFile.name,
              convertedSize: webpFile.size,
            };
          } catch (err) {
            console.error('WebP转换失败', err);
            message.warning(`${originalFile.name} 转换WebP失败，将使用原图发送`);
          }
        }

        const previewUrl = isImageFile(previewTarget)
          ? URL.createObjectURL(previewTarget)
          : undefined;

        formData.append('files', fileToSend);
        processedAttachments.push({
          uid: file.uid,
          name: fileToSend.name,
          size: fileToSend.size,
          type: fileToSend.type,
          previewUrl,
          originalName: originalFile.name,
          originalSize: originalFile.size,
          ...convertedInfo,
        });
      }

      const userMessage: Message = {
        role: 'user',
        content: inputValue,
        timestamp: Date.now(),
        attachments: processedAttachments,
      };

      const newMessages = [...messages, userMessage];
      updateCurrentSession(newMessages);
      setInputValue('');

      formData.append('provider', provider);
      formData.append('model', model);
      formData.append('message', inputValue);
      formData.append('stream', enableStream.toString()); // 根据用户选择启用/禁用流式响应
      formData.append('deepThinking', enableDeepThinking.toString()); // 根据用户选择启用/禁用深度思考

      // 构建历史消息，包含response_id信息
      const historyData = contextCurrentOnly
        ? []
        : messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            ...(msg.response_id && { response_id: msg.response_id }),
          }));
      formData.append('history', JSON.stringify(historyData));

      // 获取最后一个助手消息的response_id作为previous_response_id
      if (!contextCurrentOnly) {
        const lastAssistantMessage = messages
          .slice()
          .reverse()
          .find((msg) => msg.role === 'assistant');
        if (lastAssistantMessage?.response_id && provider === 'openai') {
          formData.append(
            'previous_response_id',
            lastAssistantMessage.response_id,
          );
        }
      }

      // 为流式输出创建一个空的助手消息，用于实时更新
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      let currentMessages = newMessages;

      if (enableStream) {
        // 只有在流式输出模式下才预先创建空的助手消息
        currentMessages = [...newMessages, assistantMessage];
        updateCurrentSession(currentMessages);
      }

      // 使用fetch API以支持流式响应
      // 在开发环境中需要使用完整的URL，因为fetch不会使用UmiJS的proxy配置
      const apiUrl =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:7001/api/chat/send'
          : '/api/chat/send';

      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!enableStream && !response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (enableStream) {
        // 处理流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  // 更新助手消息内容
                  assistantMessage.content += parsed.content;
                  currentMessages = [...newMessages, { ...assistantMessage }];
                  updateCurrentSession(currentMessages);
                }
                if (parsed.usage) {
                  // 保存usage信息到消息中
                  assistantMessage.usage = parsed.usage;
                  currentMessages = [...newMessages, { ...assistantMessage }];
                  updateCurrentSession(currentMessages);
                }
                if (parsed.response_id) {
                  // 更新response_id
                  assistantMessage.response_id = parsed.response_id;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } else {
        // 处理非流式响应
        const result = await response.json();
        if (result.success) {
          // 计算生成时间
          const generationTime = performance.now() - startTime;
          console.log('generationTime', generationTime);
          
          assistantMessage.content = result.data.content;
          assistantMessage.generation_time = generationTime;
          if (result.data.response_id) {
            assistantMessage.response_id = result.data.response_id;
          }
          if (result.data.usage) {
            assistantMessage.usage = result.data.usage;
          }
          const finalMessages = [...newMessages, assistantMessage];
          updateCurrentSession(finalMessages);
        } else {
          throw new Error(result.error || '请求失败');
        }
      }

      setFileList([]);
    } catch (error) {
      message.error('发送失败，请检查网络连接');
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileChange = ({
    fileList: newFileList,
  }: {
    fileList: UploadFile[];
  }) => {
    setFileList(newFileList);
  };

  // 清空当前对话
  const handleClear = () => {
    if (currentSessionId) {
      updateCurrentSession([]);
    }
  };

  // 切换提供商时更新模型
  const handleProviderChange = (
    newProvider:
      | 'openai'
      | 'claude'
      | 'gemini'
      | 'zhipu'
      | 'qwen'
      | 'doubao'
      | 'kimi'
      | 'deepseek',
  ) => {
    setProvider(newProvider);
    const availableModels = models[newProvider];
    if (availableModels.length > 0) {
      // 对于OpenAI，优先选择gpt-4.1，如果不可用则选择第一个
      if (newProvider === 'openai') {
        const preferredModel = availableModels.find(
          (m) => m.value === 'gpt-4.1',
        );
        setModel(preferredModel ? 'gpt-4.1' : availableModels[0].value);
      } else if (newProvider === 'gemini') {
        // 对于Gemini，优先选择最新的2.5 Pro模型
        const preferredModel = availableModels.find(
          (m) => m.value === 'gemini-2.5-pro',
        );
        setModel(preferredModel ? 'gemini-2.5-pro' : availableModels[0].value);
      } else if (newProvider === 'zhipu') {
        // 对于智谱AI，优先选择GLM-4基础模型
        const preferredModel = availableModels.find((m) => m.value === 'glm-4');
        setModel(preferredModel ? 'glm-4' : availableModels[0].value);
      } else if (newProvider === 'qwen') {
        // 对于通义千问，优先选择qwen-max模型
        const preferredModel = availableModels.find(
          (m) => m.value === 'qwen-max',
        );
        setModel(preferredModel ? 'qwen-max' : availableModels[0].value);
      } else if (newProvider === 'doubao') {
        // 对于豆包，优先选择doubao-1.5-pro-32k模型
        const preferredModel = availableModels.find(
          (m) => m.value === 'doubao-1.5-pro-32k',
        );
        setModel(
          preferredModel ? 'doubao-1.5-pro-32k' : availableModels[0].value,
        );
      } else if (newProvider === 'kimi') {
        // 对于Kimi，优先选择kimi-k2-instruct模型
        const preferredModel = availableModels.find(
          (m) => m.value === 'kimi-k2-0711-preview',
        );
        setModel(
          preferredModel ? 'kimi-k2-0711-preview' : availableModels[0].value,
        );
      } else if (newProvider === 'deepseek') {
        // 对于DeepSeek，优先选择deepseek-chat模型
        const preferredModel = availableModels.find(
          (m) => m.value === 'deepseek-chat',
        );
        setModel(
          preferredModel ? 'deepseek-chat' : availableModels[0].value,
        );
      } else {
        setModel(availableModels[0].value);
      }
    }
  };

  const handleContextCurrentOnlyChange = (nextValue: boolean) => {
    setContextCurrentOnly(nextValue);
    if (!currentSessionId) return;
    const updatedSessions = chatSessions.map((session) =>
      session.id === currentSessionId
        ? { ...session, contextCurrentOnly: nextValue, updatedAt: Date.now() }
        : session,
    );
    saveSessions(updatedSessions);
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest',
    });
  };

  // 监听滚动事件
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 10;
    setShowScrollButton(!isAtBottom);
  };

  const formatFileSize = (size: number) => {
    if (!size && size !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let currentSize = size;
    while (currentSize >= 1024 && index < units.length - 1) {
      currentSize /= 1024;
      index += 1;
    }
    return `${currentSize.toFixed(currentSize >= 10 || index === 0 ? 0 : 1)}${units[index]}`;
  };

  const isImageFile = (file?: File | Blob | null) => {
    if (!file) return false;
    return (file as File).type?.startsWith?.('image/');
  };

  const convertImageToWebp = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('无法获取画布上下文'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('WebP转换失败'));
              return;
            }
            const webpFile = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          },
          'image/webp',
          0.8,
        );
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };

      img.src = objectUrl;
    });
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* 左侧对话历史栏 */}
      <div
        style={{
          width: '280px',
          background: '#fafafa',
          borderRight: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 新建对话按钮 */}
        <div style={{ padding: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={createNewChat}
            style={{ width: '100%' }}
            size="large"
          >
            新建对话
          </Button>
        </div>

        {/* 对话历史列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '0 8px',
          }}
        >
          {chatSessions.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <MessageOutlined
                style={{ fontSize: '24px', marginBottom: '8px' }}
              />
              <div>暂无对话历史</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                点击"新建对话"开始
              </div>
            </div>
          ) : (
            <List
              dataSource={chatSessions}
              split={false}
              renderItem={(session) => (
                <List.Item
                  style={{
                    border: 'none',
                    padding: '8px',
                    margin: '4px 0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background:
                      session.id === currentSessionId
                        ? '#e6f7ff'
                        : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  className="chat-session-item"
                  onClick={() => switchToChat(session.id)}
                  onMouseEnter={(e) => {
                    if (session.id !== currentSessionId) {
                      e.currentTarget.style.background = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (session.id !== currentSessionId) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ width: '100%', position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px',
                      }}
                    >
                      <Text
                        strong={session.id === currentSessionId}
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                          flex: 1,
                          marginRight: '8px',
                        }}
                      >
                        {editingSessionId === session.id ? (
                          <Input
                            size="small"
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRename();
                              }
                            }}
                          />
                        ) : (
                          session.title
                        )}
                      </Text>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => beginRename(session, e)}
                          style={{
                            opacity: 0.6,
                            fontSize: '12px',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => deleteChat(session.id, e)}
                          style={{
                            opacity: 0.6,
                            fontSize: '12px',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                          }}
                          danger
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {session.messages.length} 条消息
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>

      {/* 右侧主聊天区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* 头部配置区 */}
        <Card 
          style={{ 
            marginBottom: 16, 
            flexShrink: 0,
            background: 'linear-gradient(135deg, #f6f9ff 0%, #e8f4f8 100%)',
            borderRadius: '12px',
            border: '1px solid #e1f0ff'
          }}
        >
          {/* 第一行：主要配置 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* 标题区域 */}
            <div style={{ minWidth: '120px' }}>
              <Title level={3} style={{ 
                margin: 0, 
                background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '20px',
                fontWeight: 600
              }}>
                DC智能体
              </Title>
            </div>

            {/* 核心配置区域 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px',
              flex: 1,
              justifyContent: 'center',
              flexWrap: 'wrap',
              minWidth: '400px'
            }}>
              {/* AI提供商选择 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>AI提供商:</Text>
                <Select
                  value={provider}
                  onChange={handleProviderChange}
                  style={{ width: 130 }}
                  size="middle"
                >
                  <Option value="openai">OpenAI</Option>
                  <Option value="claude">Claude</Option>
                  <Option value="gemini">Gemini</Option>
                  <Option value="zhipu">智谱AI</Option>
                  <Option value="qwen">Qwen</Option>
                  <Option value="doubao">豆包</Option>
                  <Option value="kimi">Kimi</Option>
                  <Option value="deepseek">DeepSeek</Option>
                </Select>
              </div>

              {/* 模型选择 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(24, 144, 255, 0.2)',
                minWidth: '200px'
              }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px', flexShrink: 0 }}>模型:</Text>
                <Select
                  value={model}
                  onChange={setModel}
                  style={{ flex: 1, minWidth: '300px' }}
                  size="middle"
                >
                  {models[provider]?.map((m) => (
                    <Option key={m.value} value={m.value}>
                      {m.label}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* 上下文仅当前开关 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>上下文仅当前:</Text>
                <Select
                  value={contextCurrentOnly}
                  onChange={handleContextCurrentOnlyChange}
                  style={{ width: 70 }}
                  size="middle"
                >
                  <Option value={false}>否</Option>
                  <Option value={true}>是</Option>
                </Select>
              </div>

              {/* 流式输出开关 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>流式输出:</Text>
                <Select
                  value={enableStream}
                  onChange={setEnableStream}
                  style={{ width: 70 }}
                  size="middle"
                >
                  <Option value={false}>否</Option>
                  <Option value={true}>是</Option>
                </Select>
              </div>

              {/* 深度思考开关 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>深度思考:</Text>
                <Select
                  value={enableDeepThinking}
                  onChange={setEnableDeepThinking}
                  style={{ width: 70 }}
                  size="middle"
                >
                  <Option value={false}>否</Option>
                  <Option value={true}>是</Option>
                </Select>
              </div>
            </div>

            {/* 操作按钮区域 */}
            <div>
              <Button 
                onClick={handleClear} 
                icon={<DeleteOutlined />}
                size="middle"
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                danger
              >
                清空对话
              </Button>
            </div>
          </div>

          {/* 第二行：状态指示器 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid rgba(24, 144, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* 会话状态指示器 */}
              {messages.length > 0 &&
                (provider === 'openai' ||
                  provider === 'gemini' ||
                  provider === 'zhipu' ||
                  provider === 'qwen' ||
                  provider === 'doubao' ||
                  provider === 'kimi' ||
                  provider === 'deepseek') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(82, 196, 26, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(82, 196, 26, 0.3)'
                  }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: '#52c41a',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Text style={{ fontSize: '12px', color: '#52c41a', fontWeight: 500 }}>
                      会话已连接
                    </Text>
                    <style>{`
                      @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                      }
                    `}</style>
                  </div>
                )}

              {/* 流式输出指示器 */}
              {enableStream && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(24, 144, 255, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(24, 144, 255, 0.3)'
                }}>
                  <span style={{ 
                    fontSize: '12px',
                    animation: 'flash 1s infinite'
                  }}>⚡</span>
                  <Text style={{ fontSize: '12px', color: '#1890ff', fontWeight: 500 }}>
                    流式输出已启用
                  </Text>
                  <style>{`
                    @keyframes flash {
                      0%, 50% { opacity: 1; }
                      51%, 100% { opacity: 0.3; }
                    }
                  `}</style>
                </div>
              )}

              {/* 深度思考指示器 */}
              {enableDeepThinking && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(114, 46, 209, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(114, 46, 209, 0.3)'
                }}>
                  <span style={{ 
                    fontSize: '12px',
                    animation: 'think 2s infinite'
                  }}>🧠</span>
                  <Text style={{ fontSize: '12px', color: '#722ed1', fontWeight: 500 }}>
                    深度思考已启用
                  </Text>
                  <style>{`
                    @keyframes think {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.1); }
                    }
                  `}</style>
                </div>
              )}
            </div>

            {/* 右侧统计信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {messages.length > 0 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  当前对话: {messages.length} 条消息
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {provider.toUpperCase()} · {models[provider]?.find(m => m.value === model)?.label || model}
              </Text>
            </div>
          </div>
        </Card>

        {/* 消息列表区 */}
        <Card
          style={{
            flex: 1,
            marginBottom: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            position: 'relative',
          }}
          styles={{
            body: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              maxHeight: '100%',
              scrollBehavior: 'smooth',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: '#999',
                  flexDirection: 'column',
                }}
              >
                <MessageOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <div style={{ fontSize: '16px' }}>暂无消息，开始对话吧！</div>
                <div
                  style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}
                >
                  {currentSessionId ? '在此对话中' : '请先选择或新建一个对话'}
                </div>
              </div>
            ) : (
              <List
                dataSource={messages}
                split={false}
                renderItem={(message) => (
                  <List.Item
                    style={{
                      border: 'none',
                      padding: '12px 0',
                      marginBottom: '8px',
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={
                            message.role === 'user' ? (
                              <UserOutlined />
                            ) : (
                              <RobotOutlined />
                            )
                          }
                          style={{
                            backgroundColor:
                              message.role === 'user' ? '#1890ff' : '#52c41a',
                            flexShrink: 0,
                          }}
                        />
                      }
                      title={
                        <Text strong>
                          {message.role === 'user' ? '用户' : 'AI助手'}
                          <Text
                            type="secondary"
                            style={{ marginLeft: 8, fontWeight: 'normal' }}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                            {message.response_id && provider === 'openai' && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: '10px',
                                  opacity: 0.6,
                                }}
                              >
                                ID: {message.response_id.slice(-8)}
                              </span>
                            )}
                            {message.usage && message.role === 'assistant' && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: '10px',
                                  opacity: 0.6,
                                  color: '#52c41a',
                                }}
                              >
                                📊{' '}
                                {message.usage.input_tokens ||
                                  message.usage.prompt_tokens ||
                                  0}
                                →
                                {message.usage.output_tokens ||
                                  message.usage.completion_tokens ||
                                  0}{' '}
                                tokens
                                {message.generation_time && (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      color: '#1890ff',
                                    }}
                                  >
                                    ⏱️ {(message.generation_time / 1000).toFixed(2)}s
                                  </span>
                                )}
                              </span>
                            )}
                          </Text>
                        </Text>
                      }
                      description={
                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            marginTop: 8,
                            wordBreak: 'break-word',
                            lineHeight: '1.6',
                          }}
                        >
                          {message.content}
                          {/* 显示光标效果（用于正在生成的消息） */}
                          {loading &&
                            message.role === 'assistant' &&
                            message === messages[messages.length - 1] &&
                            message.content && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '8px',
                                  height: '18px',
                                  backgroundColor: '#1890ff',
                                  marginLeft: '2px',
                                  animation: 'blink 1s infinite',
                                }}
                              >
                                <style>{`
                                @keyframes blink {
                                  0%, 50% { opacity: 1; }
                                  51%, 100% { opacity: 0; }
                                }
                              `}</style>
                              </span>
                            )}
                          {/* 显示打字指示器 */}
                          {loading &&
                            message.role === 'assistant' &&
                            message === messages[messages.length - 1] &&
                            !message.content && (
                              <span
                                style={{
                                  color: '#999',
                                  display: 'inline-block',
                                }}
                              >
                                <style>{`
                                @keyframes typing {
                                  0% { opacity: 0.3; }
                                  50% { opacity: 1; }
                                  100% { opacity: 0.3; }
                                }
                                .typing-dot {
                                  display: inline-block;
                                  animation: typing 1.4s infinite;
                                  margin: 0 2px;
                                }
                                .typing-dot:nth-child(2) {
                                  animation-delay: 0.2s;
                                }
                                .typing-dot:nth-child(3) {
                                  animation-delay: 0.4s;
                                }
                              `}</style>
                                <span className="typing-dot">●</span>
                                <span className="typing-dot">●</span>
                                <span className="typing-dot">●</span>
                              </span>
                            )}
                          {message.attachments && message.attachments.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: 12,
                              }}
                            >
                              {message.attachments.map((attachment) => (
                                <div
                                  key={attachment.uid}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    padding: '10px',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 8,
                                    background: '#fafafa',
                                    minHeight: 150,
                                  }}
                                >
                                  {attachment.previewUrl && (
                                    <AntdImage
                                      src={attachment.previewUrl}
                                      alt={attachment.name}
                                      width="100%"
                                      style={{
                                        borderRadius: 6,
                                        objectFit: 'cover',
                                        maxHeight: 160,
                                      }}
                                      preview={{ mask: '点击预览' }}
                                    />
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <Text strong ellipsis>
                                      {attachment.converted
                                        ? attachment.convertedName || attachment.name
                                        : attachment.name}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {attachment.converted ? (
                                        <>
                                          原图: {attachment.originalName || attachment.name} (
                                          {formatFileSize(attachment.originalSize || attachment.size)})
                                          <br />
                                          WebP: {attachment.convertedName || attachment.name} (
                                          {formatFileSize(attachment.convertedSize || attachment.size)})
                                        </>
                                      ) : (
                                        <>大小: {formatFileSize(attachment.size)}</>
                                      )}
                                    </Text>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
            <div ref={messagesEndRef} style={{ height: '1px' }} />
          </div>

          {/* 滚动到底部按钮 */}
          {showScrollButton && (
            <Button
              type="primary"
              shape="circle"
              icon={<DownOutlined />}
              onClick={scrollToBottom}
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
              title="滚动到底部"
            />
          )}
        </Card>

        {/* 输入区 */}
        <Card style={{ flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Upload
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={() => false}
                multiple
                showUploadList={false}
                accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.txt,.pdf,.docx,.doc,.md,.json,.csv"
              >
                <Button icon={<PaperClipOutlined />}>上传文件</Button>
              </Upload>
              <Checkbox
                checked={convertToWebp}
                onChange={(e) => setConvertToWebp(e.target.checked)}
              >
                压缩为WebP
              </Checkbox>
            </div>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入您的消息..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ flex: 1, minWidth: 240 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={loading}
              style={{ alignSelf: 'stretch' }}
            >
              发送
            </Button>
          </div>

          {fileList.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Text type="secondary">已选择文件:</Text>
                {fileList.map((file) => (
                  <div
                    key={file.uid}
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      padding: '4px 8px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fafafa',
                    }}
                  >
                    <Text>{file.name}</Text>
                    {typeof file.size === 'number' && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({formatFileSize(file.size)})
                      </Text>
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
                      }}
                      style={{
                        opacity: 0.6,
                        fontSize: '12px',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                      }}
                      danger
                    />
                  </div>
                ))}
                {convertToWebp && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    图片将优先压缩为 WebP 格式再发送
                  </Text>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Chat;
