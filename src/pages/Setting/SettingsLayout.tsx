import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { List, Typography } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { SidebarSection } from '../../layouts/SidebarLayout/SidebarLayout';
import SidebarLayout from '../../layouts/SidebarLayout/SidebarLayout';

const { Text } = Typography;

const SettingsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const settingMenuItems = [
    {
      key: 'profile',
      path: '/settings/profile',
      icon: <UserOutlined />,
      label: 'Profile',
      description: 'Edit your profile information'
    },
    {
      key: 'notifications',
      path: '/settings/notifications',
      icon: <SettingOutlined />,
      label: 'Notifications',
      description: 'Manage your notification preferences'
    }
  ];

  // Get current selected menu based on pathname
  const getCurrentSelectedMenu = () => {
    const path = location.pathname;
    const menuItem = settingMenuItems.find(item => item.path === path);
    return menuItem?.key || 'profile';
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
    const menuItem = settingMenuItems.find(item => item.key === menuKey);
    if (menuItem) {
      navigate(menuItem.path);
    }
  };

  // Render custom sidebar content for Settings section
  const renderSettingsSidebarContent = () => {
    const selectedMenu = getCurrentSelectedMenu();

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <List
            dataSource={settingMenuItems}
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
                    <Text
                      strong={selectedMenu === item.key}
                      className={`!text-sm ${selectedMenu === item.key
                        ? '!text-blue-600'
                        : '!text-gray-800'
                        }`}
                    >
                      {item.label}
                    </Text>
                  }
                  description={
                    <Text className="!text-xs !text-gray-500">
                      {item.description}
                    </Text>
                  }
                />
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
      selectedSection="settings"
      onSectionSelect={handleSectionSelect}
      siderWidth={300}
      customSidebarContent={renderSettingsSidebarContent()}
    >
      <Outlet />
    </SidebarLayout>
  );
};

export default SettingsLayout;