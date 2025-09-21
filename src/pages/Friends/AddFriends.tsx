import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Typography,
  Card,
  Input,
  Button,
  Avatar,
  message,
  Empty,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
  CheckOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { User } from '../../types/type';
import { userAPI } from '../../services/user.service';
import { friendRequestAPI } from '../../services/friend-request.service';

const { Text } = Typography;

// Zod schema for form validation
const searchFormSchema = z.object({
  searchText: z
    .string()
    .max(100, 'Search text is too long')
    .trim(),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

const AddFriends: React.FC = () => {
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequests, setSendingRequests] = useState<Set<number>>(new Set());
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

  // React Hook Form setup with Zod resolver
  const {
    control,
    handleSubmit,
    watch,
    trigger,
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      searchText: '',
    },
  });

  const searchText = watch('searchText');

  const handleSearch = async (data: SearchFormValues) => {
    const { searchText } = data;
    if (!searchText) return;

    setLoading(true);
    try {
      const response = await userAPI.searchUsers(null, null, searchText);

      if (response.data.status === 200) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0) {
          message.info('No users found');
        }
      } else {
        message.error(response.data.message || 'Search error');
      }
    } catch (error) {
      message.error('An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => {
    const isValid = await trigger('searchText');
    if (isValid) {
      handleSubmit(handleSearch)();
    }
  };

  const handleSendFriendRequest = async (userId: number) => {
    setSendingRequests(prev => new Set(prev).add(userId));

    try {
      const response = await friendRequestAPI.sendFriendRequest(userId);

      if (response.data.status === 200 || response.data.status === 201) {
        message.success('Friend request sent successfully');
        setSentRequests(prev => new Set(prev).add(userId));
      } else {
        message.error(response.data.message || 'Unable to send friend request');
      }
    } catch (error: any) {
      console.error('Send friend request error:', error);

      if (error.response?.status === 400) {
        message.warning('Friend request already sent');
        setSentRequests(prev => new Set(prev).add(userId));
      } else if (error.response?.status === 409) {
        message.info('You are already friends with this person');
      } else {
        message.error('An error occurred while sending friend request');
      }
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const renderUserItem = (user: User) => {
    const isSending = sendingRequests.has(user.id);
    const isSent = sentRequests.has(user.id);

    return (
      <div
        key={user.id}
        className="flex items-center justify-between p-4 border border-gray-100 rounded-xl 
                   hover:border-blue-200 hover:shadow-md transition-all duration-200 bg-white"
      >
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar
              size={56}
              src={user.avatarUrl}
              icon={<UserOutlined />}
              className="border border-gray-200 group-hover:scale-105 transition-transform duration-200"
            />
            {user.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div>
            <Text strong className="text-gray-900 text-base">{user.fullName}</Text>
            <div className="text-sm text-gray-500">@{user.username}</div>
          </div>
        </div>

        <Button
          type={isSent ? "default" : "primary"}
          icon={isSent ? <CheckOutlined /> : isSending ? <LoadingOutlined /> : <UserAddOutlined />}
          onClick={() => handleSendFriendRequest(user.id)}
          loading={isSending}
          disabled={isSent}
          size="middle"
          className={`${isSent
            ? "!border-green-300 !text-green-600 !bg-green-50 hover:!bg-green-100"
            : "!rounded-full !px-5 !shadow-sm"
            }`}
        >
          {isSent ? 'Sent' : isSending ? 'Sending...' : 'Add Friend'}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Search Section */}
        <Row justify="center" className="mb-10">
          <Col xs={24} sm={20} md={16} lg={14}>
            <Card
              className="border-0 shadow-sm rounded-xl"
              bodyStyle={{ padding: '24px' }}
            >
              <Controller
                name="searchText"
                control={control}
                render={({ field, fieldState }) => (
                  <div>
                    <Input.Search
                      {...field}
                      placeholder="Search by name, username, or email..."
                      prefix={<SearchOutlined className="text-gray-400" />}
                      size="large"
                      enterButton={
                        <Button
                          type="primary"
                          size="large"
                          loading={loading}
                          icon={<SearchOutlined />}
                          disabled={!searchText?.trim()}
                        >
                          Search
                        </Button>
                      }
                      onSearch={onSearch}
                      status={fieldState.error ? 'error' : ''}
                      className="!rounded-xl"
                    />
                    {fieldState.error && (
                      <div className="mt-2 text-red-500 text-sm">
                        {fieldState.error.message}
                      </div>
                    )}
                  </div>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Results Section */}
        <Card
          className="border-0 shadow-sm rounded-xl"
          bodyStyle={{ padding: '24px' }}
        >
          {loading ? (
            <div className="text-center py-12">
              <Spin size="large" />
              <div className="mt-4">
                <Text className="text-gray-600">Searching...</Text>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Text strong className="text-gray-900 text-base">
                  Found {searchResults.length} {searchResults.length === 1 ? 'person' : 'people'}
                </Text>
              </div>

              <div className="space-y-3">
                {searchResults.map(renderUserItem)}
              </div>

              {searchResults.length > 10 && (
                <div className="mt-6 text-center">
                  <Button type="text" className="text-gray-500">
                    Load more results
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              imageStyle={{ height: 100 }}
              description={
                <div className="text-center">
                  <Text className="text-gray-600 block mb-2">
                    Search for friends to get started
                  </Text>
                  <Button type="link" className="text-blue-500">
                    Invite Friends
                  </Button>
                </div>
              }
              className="py-12"
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default AddFriends;