import React, { useState, useRef, useEffect } from 'react';
import {
  Layout,
  List,
  Avatar,
  Input,
  Button,
  Typography,
  Badge,
  Space,
  Card,
  Row,
  Col,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  SearchOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

// Types
interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'other';
  senderName: string;
}

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  online: boolean;
}

// Mock data
const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    lastMessage: 'Hey! How are you doing today?',
    timestamp: new Date(Date.now() - 300000),
    unreadCount: 2,
    online: true,
  },
  {
    id: '2',
    name: 'Bob Smith',
    lastMessage: 'Can we schedule a meeting tomorrow?',
    timestamp: new Date(Date.now() - 3600000),
    unreadCount: 0,
    online: false,
  },
  {
    id: '3',
    name: 'Carol Davis',
    lastMessage: 'Thanks for your help!',
    timestamp: new Date(Date.now() - 7200000),
    unreadCount: 1,
    online: true,
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      text: 'Hi there! How are you?',
      timestamp: new Date(Date.now() - 1800000),
      sender: 'other',
      senderName: 'Alice Johnson',
    },
    {
      id: '2',
      text: 'I\'m doing great, thanks! How about you?',
      timestamp: new Date(Date.now() - 1700000),
      sender: 'user',
      senderName: 'You',
    },
    {
      id: '3',
      text: 'Pretty good! Working on some new projects.',
      timestamp: new Date(Date.now() - 1600000),
      sender: 'other',
      senderName: 'Alice Johnson',
    },
    {
      id: '4',
      text: 'Hey! How are you doing today?',
      timestamp: new Date(Date.now() - 300000),
      sender: 'other',
      senderName: 'Alice Johnson',
    },
  ],
  '2': [
    {
      id: '5',
      text: 'Can we schedule a meeting tomorrow?',
      timestamp: new Date(Date.now() - 3600000),
      sender: 'other',
      senderName: 'Bob Smith',
    },
  ],
  '3': [
    {
      id: '6',
      text: 'Thanks for your help!',
      timestamp: new Date(Date.now() - 7200000),
      sender: 'other',
      senderName: 'Carol Davis',
    },
  ],
};

export default function Home() {
  const [selectedChat, setSelectedChat] = useState<string>('1');
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
  const [newMessage, setNewMessage] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      timestamp: new Date(),
      sender: 'user',
      senderName: 'You',
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), message],
    }));

    // Update last message in chat list
    setChats(prev =>
      prev.map(chat =>
        chat.id === selectedChat
          ? { ...chat, lastMessage: newMessage, timestamp: new Date() }
          : chat
      )
    );

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedChatData = chats.find(chat => chat.id === selectedChat);
  const currentMessages = messages[selectedChat] || [];

  return (
    <Layout className="!h-screen">
      {/* Chat List Sidebar */}
      <Sider
        width={350}
        className="!bg-white !border-r !border-gray-200"
      >
        <div className="p-4">
          <Title level={4} className="!m-0">Messages</Title>
        </div>

        <div className="px-4 pb-4">
          <Input
            placeholder="Search conversations..."
            prefix={<SearchOutlined />}
            className="!rounded-full"
          />
        </div>

        <List
          dataSource={chats}
          className="!border-none"
          renderItem={(chat) => (
            <List.Item
              onClick={() => setSelectedChat(chat.id)}
              className={`
                !cursor-pointer !transition-all !duration-200 hover:!bg-gray-50 !py-3 !px-4 !border-none
                ${selectedChat === chat.id
                  ? '!bg-green-50 !border-l-4 !border-l-green-500'
                  : '!border-l-0'
                }
              `}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot={chat.online} offset={[-8, 8]}>
                    <Avatar
                      size={48}
                      src={chat.avatar}
                      icon={<UserOutlined />}
                      className={`${chat.online ? '!bg-green-500' : '!bg-gray-400'}`}
                    />
                  </Badge>
                }
                title={
                  <div className="flex justify-between items-center">
                    <Text strong className="!text-sm">{chat.name}</Text>
                    <Text type="secondary" className="!text-xs">
                      {formatTime(chat.timestamp)}
                    </Text>
                  </div>
                }
                description={
                  <div className="flex justify-between items-center">
                    <Text
                      ellipsis
                      className="!text-xs !text-gray-600 !flex-1 !mr-2"
                    >
                      {chat.lastMessage}
                    </Text>
                    {chat.unreadCount > 0 && (
                      <Badge
                        count={chat.unreadCount}
                        size="small"
                        color='blue'
                      />
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Sider>

      {/* Main Chat Area */}
      <Layout>
        {/* Chat Header */}
        <Header className="!bg-white !px-6 !border-b !border-gray-200 !flex !items-center !justify-between">
          {selectedChatData && (
            <Space className='!h-full'>
              <Badge dot={selectedChatData.online} offset={[-8, 8]}>
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  className={`${selectedChatData.online ? '!bg-green-500' : '!bg-gray-400'}`}
                />
              </Badge>
              <div className="flex flex-col">
                <Text strong className="!text-base !leading-5">{selectedChatData.name}</Text>
                <Text type="secondary" className="!text-xs !leading-4">
                  {selectedChatData.online ? 'Online' : 'Offline'}
                </Text>
              </div>
            </Space>
          )}
          <Button type="text" icon={<MoreOutlined />} />
        </Header>

        {/* Messages Area */}
        <Content className="!p-4 !overflow-auto !bg-gray-50">
          <div className="max-w-3xl mx-auto">
            {currentMessages.map((message) => (
              <div key={message.id} className="mb-4">
                <Row justify={message.sender === 'user' ? 'end' : 'start'}>
                  <Col xs={18} sm={16} md={12}>
                    <Card
                      size="small"
                      className={`
                        !rounded-2xl !shadow-md
                        ${message.sender === 'user'
                          ? '!bg-blue-500 !border-none'
                          : '!bg-white !border !border-gray-200'
                        }
                      `}
                      styles={{
                        body: {
                          padding: '8px 12px',
                        },
                      }}
                    >
                      <Text className={`${message.sender === 'user' ? '!text-white' : '!text-black'}`}>
                        {message.text}
                      </Text>
                      <div className="text-right mt-1">
                        <Text className={`
                          !text-xs 
                          ${message.sender === 'user'
                            ? '!text-white !text-opacity-70'
                            : '!text-gray-500'
                          }
                        `}>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </Content>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <Space.Compact className="!w-full">
              <TextArea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                className="!rounded-full !pr-12 !resize-none"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="!h-auto !rounded-full !ml-2 !min-w-11"
              />
            </Space.Compact>
          </div>
        </div>
      </Layout>
    </Layout>
  );
};