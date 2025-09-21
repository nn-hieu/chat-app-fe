import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { List, Typography, Badge } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  UserSwitchOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { SidebarSection } from '../../layouts/SidebarLayout/SidebarLayout';
import SidebarLayout from '../../layouts/SidebarLayout/SidebarLayout';
import { useFriendRequestsStore } from '../../stores/friendRequestsStore';

const { Text } = Typography;

const FriendsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand store
  const {
    pendingReceivedCount,
    refreshPendingCount,
    initializeSocketListener,
    cleanupSocketListener,
  } = useFriendRequestsStore();

  // Initialize store data and socket listener when component mounts
  useEffect(() => {
    // Load initial data
    refreshPendingCount();

    // Initialize socket listener
    const cleanup = initializeSocketListener();

    // Cleanup on unmount
    return () => {
      cleanup();
      cleanupSocketListener();
    };
  }, [refreshPendingCount, initializeSocketListener, cleanupSocketListener]);

  // Define sections
  const sections: SidebarSection[] = [
    {
      key: 'chats',
      label: 'Chats',
      icon: <MessageOutlined />,
    },
    {
      key: 'friends',
      label: 'Friends',
      icon: <TeamOutlined />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
    },
  ];

  const friendMenuItems = [
    {
      key: 'all',
      path: '/friends/all',
      icon: <TeamOutlined />,
      label: 'All Friends',
      description: 'View and manage your friends'
    },
    {
      key: 'requests',
      path: '/friends/requests',
      icon: <UserAddOutlined />,
      label: 'Friend Requests',
      description: 'Pending friend requests'
    },
    {
      key: 'add',
      path: '/friends/add',
      icon: <UsergroupAddOutlined />,
      label: 'Add Friends',
      description: 'Find and add new friends'
    },
    {
      key: 'blocked',
      path: '/friends/blocked',
      icon: <UserSwitchOutlined />,
      label: 'Blocked Users',
      description: 'Manage blocked users'
    }
  ];

  // Get current selected menu based on pathname
  const getCurrentSelectedMenu = () => {
    const path = location.pathname;
    const menuItem = friendMenuItems.find(item => item.path === path);
    return menuItem?.key || 'all';
  };

  // Handle section navigation
  const handleSectionSelect = (sectionKey: string) => {
    switch (sectionKey) {
      case 'chats':
        navigate('/chats');
        break;
      case 'friends':
        navigate('/friends');
        break;
      case 'settings':
        navigate('/settings');
        break;
    }
  };

  // Handle menu navigation
  const handleMenuSelect = (menuKey: string) => {
    const menuItem = friendMenuItems.find(item => item.key === menuKey);
    if (menuItem) {
      navigate(menuItem.path);
    }
  };

  // Render custom sidebar content for Friends section
  const renderFriendsSidebarContent = () => {
    const selectedMenu = getCurrentSelectedMenu();

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <List
            dataSource={friendMenuItems}
            className="!border-none"
            renderItem={(item) => (
              <List.Item
                onClick={() => handleMenuSelect(item.key)}
                className={`
                  !cursor-pointer !transition-all !duration-200 hover:!bg-gray-50 !py-4 !px-4 !border-none
                  ${selectedMenu === item.key
                    ? '!bg-blue-50 !border-l-4 !border-l-blue-500'
                    : '!border-l-0'
                  }
                `}
              >
                <List.Item.Meta
                  avatar={
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center 
                      ${selectedMenu === item.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {item.icon}
                    </div>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <Text
                        strong={selectedMenu === item.key}
                        className={`!text-sm ${selectedMenu === item.key
                          ? '!text-blue-600'
                          : '!text-gray-800'
                          }`}
                      >
                        {item.label}
                      </Text>
                    </div>
                  }
                  description={
                    <Text className="!text-xs !text-gray-500">
                      {item.description}
                    </Text>
                  }
                />

                {item.key === 'requests' && pendingReceivedCount > 0 && (
                  <Badge
                    count={pendingReceivedCount}
                    size="small"
                    className="!ml-2"
                  />
                )}

              </List.Item>
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <SidebarLayout
      sections={sections}
      selectedSection="friends"
      onSectionSelect={handleSectionSelect}
      siderWidth={300}
      customSidebarContent={renderFriendsSidebarContent()}
    >
      <Outlet />
    </SidebarLayout>
  );
};

export default FriendsLayout;