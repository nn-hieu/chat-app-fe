import React, { type ReactNode } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Select, type MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

export interface SidebarMenuItem {
  key: string;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
}

export interface SidebarSection {
  key: string;
  label: string;
  icon?: ReactNode;
  menuItems?: SidebarMenuItem[];
}

interface SidebarLayoutProps {
  title?: string; // Made optional since we now have sections
  menuItems?: SidebarMenuItem[]; // Keep for backward compatibility
  selectedKey?: string; // Made optional since we don't always need it
  onMenuSelect?: (key: string) => void; // Made optional
  children: ReactNode;
  siderWidth?: number;
  showHeader?: boolean;
  headerTitle?: string;
  headerExtra?: ReactNode;
  sections?: SidebarSection[];
  selectedSection?: string;
  onSectionSelect?: (sectionKey: string) => void;
  customSidebarContent?: ReactNode;
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  title,
  menuItems = [],
  selectedKey,
  onMenuSelect,
  children,
  siderWidth = 300,
  showHeader = false,
  headerTitle,
  headerExtra,
  sections,
  selectedSection,
  onSectionSelect,
  customSidebarContent,
}) => {
  const { user, logout } = useAuth();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <Layout className="!h-screen">
      {/* Sidebar */}
      <Sider width={siderWidth} className="!bg-white !border-r !border-gray-200">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Dropdown selector cho sections hoặc title cũ */}
            {sections && sections.length > 0 ? (
              <Select
                value={selectedSection}
                onChange={onSectionSelect}
                className="!min-w-32"
                size="large"
                variant="borderless"
                suffixIcon={<DownOutlined />}
                options={sections.map(section => ({
                  value: section.key,
                  label: (
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <span className="font-medium">{section.label}</span>
                    </div>
                  )
                }))}
              />
            ) : (
              <Title level={4} className="!m-0">{title}</Title>
            )}
            
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar
                size={32}
                src={user?.avatarUrl}
                icon={<UserOutlined />}
                className="cursor-pointer hover:opacity-80"
              />
            </Dropdown>
          </div>
        </div>

        {/* Custom Sidebar Content or Default Menu */}
        {customSidebarContent ? (
          // Render custom sidebar content if provided
          <div className="flex-1 overflow-hidden">
            {customSidebarContent}
          </div>
        ) : (
          (!sections || sections.length === 0) && menuItems.length > 0 && (
            <Menu
              mode="vertical"
              selectedKeys={selectedKey ? [selectedKey] : []}
              onSelect={({ key }) => onMenuSelect?.(key)}
              className="!border-none !bg-transparent"
              items={menuItems.map(item => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
                onClick: item.onClick,
              }))}
            />
          )
        )}
      </Sider>

      {/* Main Content Area */}
      <Layout>
        {/* Optional Header */}
        {showHeader && (
          <Header className="!bg-white !px-6 !border-b !border-gray-200 !flex !items-center !justify-between">
            <Title level={3} className="!m-0">{headerTitle}</Title>
            {headerExtra}
          </Header>
        )}

        {/* Content */}
        <Content className="!overflow-auto !bg-gray-50">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default SidebarLayout;