import {
  CopyOutlined,
  FilterOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import { Button, Card, Input, message, Space, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useRef, useState } from 'react';
import styles from './index.less';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const RuleFilter: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [items, setItems] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleFilter = async () => {
    if (fileList.length === 0) {
      message.error('请先上传规则文件');
      return;
    }

    if (!items.trim()) {
      message.error('请输入要过滤的项目');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', fileList[0].originFileObj as any);
    formData.append('items', items);

    try {
      const response = await request('/api/rule/filter', {
        method: 'POST',
        data: formData,
      });

      if (response.success) {
        setResult(JSON.stringify(response.data, null, 2));
        message.success('过滤成功');
      } else {
        message.error(response.message || '过滤失败');
      }
    } catch (error) {
      message.error('请求失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard
        .writeText(result)
        .then(() => {
          message.success('已复制到剪贴板');
        })
        .catch(() => {
          message.error('复制失败，请手动复制');
        });
    }
  };

  const beforeUpload = (file: File) => {
    const isJson =
      file.type === 'application/json' || file.name.endsWith('.json');
    if (!isJson) {
      message.error('只能上传 JSON 文件!');
      return false;
    }
    return false; // 阻止自动上传
  };

  return (
    <div className={styles.container}>
      <Card>
        <Title level={3}>规则过滤工具</Title>
        <Paragraph>
          上传规则文件（JSON格式），输入要过滤的项目列表，点击过滤按钮生成结果。
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>1. 上传规则文件</Title>
            <Upload
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择文件 (JSON)</Button>
            </Upload>
          </div>

          <div>
            <Title level={5}>2. 输入要过滤的项目</Title>
            <Paragraph type="secondary">
              支持两种格式：JSON数组格式如 ["item1", "item2"] 或逗号分隔格式如
              item1, item2, item3
            </Paragraph>
            <TextArea
              rows={6}
              placeholder={
                '["item_name", "brand", "color"] 或 item_name, brand, color'
              }
              value={items}
              onChange={(e) => setItems(e.target.value)}
            />
          </div>

          <div>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleFilter}
              loading={loading}
              size="large"
            >
              开始过滤
            </Button>
          </div>

          {result && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Title level={5}>3. 过滤结果</Title>
                <Button icon={<CopyOutlined />} onClick={handleCopy}>
                  复制结果
                </Button>
              </div>
              <div ref={resultRef} className={styles.resultContainer}>
                <pre className={styles.resultPre}>{result}</pre>
              </div>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default RuleFilter;
