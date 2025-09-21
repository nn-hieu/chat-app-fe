import React from 'react';
import { Typography, Card, Switch, List } from 'antd';

const { Title } = Typography;

const NotificationSettings: React.FC = () => {
  const notificationOptions = [
    {
      title: 'Message Notifications',
      description: 'Receive notifications for new messages',
      key: 'messages'
    },
    {
      title: 'Friend Requests',
      description: 'Receive notifications for friend requests',
      key: 'friendRequests'
    },
    {
      title: 'Online Status',
      description: 'Notify friends when you come online',
      key: 'onlineStatus'
    },
    {
      title: 'Sound Notifications',
      description: 'Play sound for notifications',
      key: 'sound'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3}>Notification Settings</Title>
      </div>
      
      <Card>
        <List
          dataSource={notificationOptions}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Switch key={item.key} defaultChecked />
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default NotificationSettings;