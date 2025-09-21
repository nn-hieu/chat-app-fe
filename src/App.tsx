import { ConfigProvider, message, notification } from 'antd';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import AppRoute from './routes/AppRoute';

const App: React.FC = () => {
  message.config({
    duration: 1.5, 
  });

  notification.config({
    duration: 2.5,
  });

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <AppRoute />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;