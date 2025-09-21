import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Card,
  List,
  Button,
  Avatar,
  Space,
  Tabs,
  Empty,
  message,
  Spin,
  Tag,
  Popconfirm,
  Badge
} from 'antd';
import {
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  SendOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { friendRequestAPI } from '../../services/friend-request.service';
import { webSocketService } from '../../services/websocket.service';
import { useFriendRequestsStore } from '../../stores/friendRequestsStore';
import type { FriendRequest } from '../../types/type';

const { Title, Text } = Typography;

const FriendRequests: React.FC = () => {
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('received');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Zustand store
  const { setPendingReceivedCount } = useFriendRequestsStore();

  // Load friend requests
  useEffect(() => {
    loadFriendRequests();
  }, []);

  // Update store when receivedRequests changes
  useEffect(() => {
    const pendingCount = receivedRequests.filter(req => req.status === 'PENDING').length;
    setPendingReceivedCount(pendingCount);
  }, [receivedRequests, setPendingReceivedCount]);

  // Socket integration for real-time updates (component-level)
  useEffect(() => {
    const unsubscribe = webSocketService.onFriendRequest(handleSocketFriendRequest);
    return unsubscribe;
  }, []);

  const handleSocketFriendRequest = useCallback((friendRequest: FriendRequest) => {
    try {
      const currentUserId = parseInt(webSocketService.getCurrentUserId() || '0');

      if (friendRequest.receiverId === currentUserId) {
        // This is a request sent TO current user (received request)
        if (friendRequest.status === 'PENDING') {
          handleNewRequest(friendRequest);
        } else if (friendRequest.status === 'CANCELLED') {
          handleRequestCancelled(friendRequest);
        }
      } else if (friendRequest.senderId === currentUserId) {
        // This is a request sent BY current user (sent request)
        if (friendRequest.status === 'ACCEPTED') {
          handleRequestAccepted(friendRequest);
        } else if (friendRequest.status === 'REJECTED') {
          handleRequestRejected(friendRequest);
        }
      }
    } catch (error) {
      console.error('Error handling socket friend request:', error);
    }
  }, []);

  const handleNewRequest = useCallback((friendRequest: FriendRequest) => {
    // Add new request to received requests
    setReceivedRequests(prev => {
      const exists = prev.find(req => req.id === friendRequest.id);
      if (exists) return prev;
      return [friendRequest, ...prev];
    });

    // Switch to received tab to show new request
    setActiveTab('received');
  }, []);

  const handleRequestAccepted = useCallback((friendRequest: FriendRequest) => {
    // Update sent requests list
    setSentRequests(prev =>
      prev.map(req =>
        req.id === friendRequest.id
          ? { ...req, status: 'ACCEPTED', respondedAt: friendRequest.respondedAt }
          : req
      )
    );
  }, []);

  const handleRequestRejected = useCallback((friendRequest: FriendRequest) => {
    // Update sent requests list
    setSentRequests(prev =>
      prev.map(req =>
        req.id === friendRequest.id
          ? { ...req, status: 'REJECTED', respondedAt: friendRequest.respondedAt }
          : req
      )
    );
  }, []);

  const handleRequestCancelled = useCallback((friendRequest: FriendRequest) => {
    // Remove from received requests list
    setReceivedRequests(prev =>
      prev.filter(req => req.id !== friendRequest.id)
    );
  }, []);

  const loadFriendRequests = async () => {
    await Promise.all([
      loadSentRequests(),
      loadReceivedRequests()
    ]);
  };

  const loadSentRequests = async () => {
    try {
      setLoadingSent(true);
      const response = await friendRequestAPI.getSentRequests();
      setSentRequests(response.data.data || []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      message.error('Failed to load sent requests');
    } finally {
      setLoadingSent(false);
    }
  };

  const loadReceivedRequests = async () => {
    try {
      setLoadingReceived(true);
      const response = await friendRequestAPI.getReceivedRequests();
      const data = response.data.data || [];
      setReceivedRequests(data);
    } catch (error) {
      console.error('Error loading received requests:', error);
      message.error('Failed to load received requests');
    } finally {
      setLoadingReceived(false);
    }
  };

  const handleRespondToRequest = async (requestId: number, isAccepted: boolean | null) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId));

      await friendRequestAPI.respondToFriendRequest(requestId, isAccepted);

      const actionText = isAccepted === true ? 'accepted' :
        isAccepted === false ? 'rejected' : 'cancelled';
      message.success(`Friend request ${actionText} successfully`);

      // Update local state immediately for better UX
      if (isAccepted === true || isAccepted === false) {
        // Update received requests
        setReceivedRequests(prev =>
          prev.map(req =>
            req.id === requestId
              ? { ...req, status: isAccepted ? 'ACCEPTED' : 'REJECTED', respondedAt: new Date().toISOString() }
              : req
          )
        );
      } else {
        // Remove cancelled sent request
        setSentRequests(prev =>
          prev.filter(req => req.id !== requestId)
        );
      }

    } catch (error) {
      console.error('Error responding to friend request:', error);
      message.error('Failed to respond to friend request');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return '1m ago';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'ACCEPTED': return 'green';
      case 'REJECTED': return 'red';
      case 'CANCELLED': return 'gray';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <ClockCircleOutlined />;
      case 'ACCEPTED': return <CheckOutlined />;
      case 'REJECTED': return <CloseOutlined />;
      case 'CANCELLED': return <CloseOutlined />;
      default: return null;
    }
  };

  // Filter pending requests for counts
  const pendingReceived = receivedRequests.filter(req => req.status === 'PENDING');
  const pendingSent = sentRequests.filter(req => req.status === 'PENDING');

  const renderReceivedRequests = () => {
    if (loadingReceived) {
      return (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      );
    }

    if (receivedRequests.length === 0) {
      return (
        <Empty
          image={<InboxOutlined className="text-4xl text-gray-300" />}
          description={
            <div>
              <Text type="secondary">No friend requests received</Text>
            </div>
          }
        />
      );
    }

    return (
      <List
        className="!border-none"
        dataSource={receivedRequests}
        renderItem={(request: FriendRequest) => {
          const isProcessing = processingIds.has(request.id);
          const isPending = request.status === 'PENDING';

          return (
            <List.Item
              className="!px-0 !py-4 !border-b !border-gray-100 last:!border-b-0"
            >
              <div className="flex items-center space-x-4 w-full">
                <Avatar
                  size={48}
                  icon={<UserOutlined />}
                  src={request.senderAvatar}
                  className="!mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Text strong className="!text-base">
                      {request.senderUsername}
                    </Text>
                    <Tag
                      icon={getStatusIcon(request.status)}
                      color={getStatusColor(request.status)}
                      className="!text-xs"
                    >
                      {request.status}
                    </Tag>
                  </div>
                  <div className="mt-1">
                    <Text type="secondary" className="!text-xs">
                      Sent {formatTime(request.createdAt)}
                    </Text>
                    <br />
                    {request.respondedAt && request.status !== 'PENDING' && (
                      <Text type="secondary" className="!text-xs">
                        Responded {formatTime(request.respondedAt)}
                      </Text>
                    )}
                  </div>
                </div>
              </div>

              {isPending && (
                <Space>
                  <Popconfirm
                    title="Reject friend request?"
                    description="Are you sure you want to reject this friend request?"
                    onConfirm={() => handleRespondToRequest(request.id, false)}
                    okText="Reject"
                    cancelText="Cancel"
                    okType="danger"
                  >
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      loading={isProcessing}
                      className="!text-red-500 hover:!bg-red-50 hover:!border-red-200"
                    >
                      Reject
                    </Button>
                  </Popconfirm>
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    loading={isProcessing}
                    onClick={() => handleRespondToRequest(request.id, true)}
                    className="!text-green-500 hover:!bg-green-50 hover:!border-green-200"
                  >
                    Accept
                  </Button>
                </Space>
              )}
            </List.Item>
          );
        }}
      />
    );
  };

  const renderSentRequests = () => {
    if (loadingSent) {
      return (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      );
    }

    if (sentRequests.length === 0) {
      return (
        <Empty
          image={<SendOutlined className="text-4xl text-gray-300" />}
          description={
            <div>
              <Text type="secondary">No friend requests sent</Text>
            </div>
          }
        />
      );
    }

    return (
      <List
        className="!border-none"
        dataSource={sentRequests}
        renderItem={(request: FriendRequest) => {
          const isProcessing = processingIds.has(request.id);
          const isPending = request.status === 'PENDING';

          return (
            <List.Item
              className="!px-0 !py-4 !border-b !border-gray-100 last:!border-b-0"
            >
              <div className="flex items-center space-x-4 w-full">
                <Avatar
                  src={request.receiverAvatar}
                  size={48}
                  icon={<UserOutlined />}
                  className="!mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Text strong className="!text-base">
                      {request.receiverUsername}
                    </Text>
                    <Tag
                      icon={getStatusIcon(request.status)}
                      color={getStatusColor(request.status)}
                      className="!text-xs"
                    >
                      {request.status}
                    </Tag>
                  </div>
                  <div className="mt-1">
                    <Text type="secondary" className="!text-xs">
                      Sent {formatTime(request.createdAt)}
                    </Text>
                    <br />
                    {request.respondedAt && request.status !== 'PENDING' && (
                      <Text type="secondary" className="!text-xs">
                        Responded {formatTime(request.respondedAt)}
                      </Text>
                    )}
                  </div>
                </div>
              </div>

              {isPending && (
                <Popconfirm
                  title="Cancel friend request?"
                  description="Are you sure you want to cancel this friend request?"
                  onConfirm={() => handleRespondToRequest(request.id, null)}
                  okText="Cancel Request"
                  cancelText="Keep"
                  okType="danger"
                >
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    loading={isProcessing}
                    className="!text-red-500 hover:!bg-red-50 hover:!border-red-200"
                  >
                    Cancel
                  </Button>
                </Popconfirm>
              )}
            </List.Item>
          );
        }}
      />
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3}>Friend Requests</Title>
      </div>

      <Card className="!border-gray-200">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="!mb-0"
          items={[
            {
              key: 'received',
              label: (
                <Space>
                  <InboxOutlined />
                  Received
                  {pendingReceived.length > 0 && (
                    <Badge
                      count={pendingReceived.length}
                      size="small"
                      className="!ml-1"
                    />
                  )}
                </Space>
              ),
              children: (
                <div>
                  {pendingReceived.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Text className="!text-blue-600 !text-sm">
                        <InboxOutlined className="mr-2" />
                        You have {pendingReceived.length} pending friend request{pendingReceived.length > 1 ? 's' : ''}
                      </Text>
                    </div>
                  )}
                  {renderReceivedRequests()}
                </div>
              )
            },
            {
              key: 'sent',
              label: (
                <Space>
                  <SendOutlined />
                  Sent
                  {pendingSent.length > 0 && (
                    <Badge
                      count={pendingSent.length}
                      size="small"
                      className="!ml-1"
                    />
                  )}
                </Space>
              ),
              children: (
                <div>
                  {pendingSent.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Text className="!text-orange-600 !text-sm">
                        <ClockCircleOutlined className="mr-2" />
                        You have {pendingSent.length} pending friend request{pendingSent.length > 1 ? 's' : ''}
                      </Text>
                    </div>
                  )}
                  {renderSentRequests()}
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default FriendRequests;