import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Upload,
  Select,
  Space,
  List,
  Avatar,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  UserOutlined,
  RobotOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import type { UploadFile } from 'antd/es/upload/interface';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Models {
  openai: Array<{ value: string; label: string }>;
  claude: Array<{ value: string; label: string }>;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [provider, setProvider] = useState<'openai' | 'claude'>('openai');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [models, setModels] = useState<Models>({ openai: [], claude: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() && fileList.length === 0) {
      message.warning('请输入消息或上传文件');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('provider', provider);
      formData.append('model', model);
      formData.append('message', inputValue);
      formData.append('history', JSON.stringify(messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))));

      // 添加文件
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      const response = await request('/api/chat/send', {
        method: 'POST',
        data: formData,
      });

      if (response.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setFileList([]); // 清空文件列表
      } else {
        message.error(response.error || '发送失败');
      }
    } catch (error) {
      message.error('发送失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    setFileList([]);
  };

  // 切换提供商时更新模型
  const handleProviderChange = (newProvider: 'openai' | 'claude') => {
    setProvider(newProvider);
    const availableModels = models[newProvider];
    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 头部配置区 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Title level={4} style={{ margin: 0 }}>DC智能体</Title>
          </Col>
          <Col span={6}>
            <Space>
              <Text>AI提供商:</Text>
              <Select
                value={provider}
                onChange={handleProviderChange}
                style={{ width: 120 }}
              >
                <Option value="openai">OpenAI</Option>
                <Option value="claude">Claude</Option>
              </Select>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <Text>模型:</Text>
              <Select
                value={model}
                onChange={setModel}
                style={{ width: 150 }}
              >
                {models[provider]?.map(m => (
                  <Option key={m.value} value={m.value}>
                    {m.label}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button onClick={handleClear} icon={<DeleteOutlined />}>
              清空对话
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 消息列表区 */}
      <Card 
        style={{ 
          flex: 1, 
          marginBottom: 16, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item style={{ border: 'none', padding: '12px 0' }}>
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      style={{ 
                        backgroundColor: message.role === 'user' ? '#1890ff' : '#52c41a' 
                      }}
                    />
                  }
                  title={
                    <Text strong>
                      {message.role === 'user' ? '用户' : 'AI助手'}
                      <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Text>
                    </Text>
                  }
                  description={
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      {message.content}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* 输入区 */}
      <Card>
        <Space.Compact style={{ width: '100%' }}>
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false} // 阻止自动上传
            multiple
            showUploadList={{ showRemoveIcon: true }}
          >
            <Button icon={<PaperClipOutlined />}>
              上传文件
            </Button>
          </Upload>
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
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={loading}
          >
            发送
          </Button>
        </Space.Compact>
        
        {fileList.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary">已选择文件: </Text>
              {fileList.map(file => (
                <Text key={file.uid} style={{ marginRight: 8 }}>
                  {file.name}
                </Text>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Chat; 