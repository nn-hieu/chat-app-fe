import React, { useState } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  message,
  Row,
  Col
} from 'antd';
import { UserOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/user.service';
import type { UserUpdateRequest } from '../../types/type';

const { Title, Text } = Typography;

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleBeforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    return false;
  };

  const handleSubmit = async (values: any) => {
    if (!user?.id) {
      message.error('User not found');
      return;
    }

    try {
      setLoading(true);

      // Prepare update request - only include changed values
      const updateRequest: UserUpdateRequest = {
        email: values.email !== user.email ? values.email : user.email,
        firstName: values.firstName !== user.firstName ? values.firstName : user.firstName,
        lastName: values.lastName !== user.lastName ? values.lastName : user.lastName,
      };

      // Check if there are any changes (including avatar)
      const hasChanges = 
        updateRequest.email !== user.email ||
        updateRequest.firstName !== user.firstName ||
        updateRequest.lastName !== user.lastName ||
        avatarFile !== null;

      if (!hasChanges) {
        return;
      }

      // Call userAPI.updateProfile
      const response = await userAPI.updateProfile(user.id, updateRequest, avatarFile || undefined);

      if (response.data.status === 200 && response.data.data) {
        // Update user in AuthContext
        if (updateUser) {
          updateUser(response.data.data);
        }

        message.success('Profile updated successfully!');
        setAvatarFile(null);
        
        // Update avatar URL if it was changed
        if (response.data.data.avatarUrl) {
          setAvatarUrl(response.data.data.avatarUrl);
        }
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className='!h-full'>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          username: user?.username,
          email: user?.email || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
        }}
      >
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4 group">
            <Upload
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
              accept="image/*"
            >
              <div className="relative cursor-pointer">
                <Avatar
                  size={120}
                  src={avatarUrl ? avatarUrl : null}
                  icon={<UserOutlined />}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-center text-white">
                    <CameraOutlined className="!text-2xl !mb-1" />
                    <div className="text-xs">Change Photo</div>
                  </div>
                </div>
              </div>
            </Upload>
          </div>
        </div>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Username" name="username">
              <Input
                placeholder="Username"
                disabled
                className="bg-gray-50"
              />
            </Form.Item>
          </Col>

          {/* Email */}
          <Col span={24}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input
                placeholder="Enter your email"
                type="email"
              />
            </Form.Item>
          </Col>

          {/* First Name */}
          <Col span={12}>
            <Form.Item
              label="First Name"
              name="firstName"
              rules={[
                { max: 20, message: 'First name cannot exceed 20 characters!' },
              ]}
            >
              <Input
                placeholder="Enter your first name"
                maxLength={20}
              />
            </Form.Item>
          </Col>

          {/* Last Name */}
          <Col span={12}>
            <Form.Item
              label="Last Name"
              name="lastName"
              rules={[
                { max: 20, message: 'Last name cannot exceed 20 characters!' },
              ]}
            >
              <Input
                placeholder="Enter your last name"
                maxLength={20}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Account Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <Title level={5} className="mb-3">Account Information</Title>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text type="secondary" className="text-sm">Account Status:</Text>
              <div className="flex items-center mt-1">
                <span className={`w-2 h-2 rounded-full mr-2 ${user?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <Text className="text-sm">{user?.isOnline ? 'Online' : 'Offline'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary" className="text-sm">Member since:</Text>
              <Text className="text-sm block mt-1">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : 'Never'
                }
              </Text>
            </Col>
          </Row>
        </div>

        {/* Submit Button */}
        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
            className="w-full md:w-auto"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProfileSettings;