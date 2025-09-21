import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ChatHome from '../../pages/ChatHome';
import Login from '../../pages/Login';
import PrivateRoute from '../PrivateRoute';
import PublicRoute from '../PublicRoute';
import NotFound from '../../pages/NotFound';
import FriendsLayout from '../../pages/Friends/FriendsLayout';
import AllFriends from '../../pages/Friends/AllFriends';
import FriendRequests from '../../pages/Friends/FriendRequests';
import AddFriends from '../../pages/Friends/AddFriends';
import BlockedUsers from '../../pages/Friends/BlockedUsers';
import SettingsLayout from '../../pages/Setting/SettingsLayout';
import ProfileSettings from '../../pages/Setting/ProfileSettings';
import NotificationSettings from '../../pages/Setting/NotificationSettings';

const AppRoute: React.FC = () => {
  return (
    <Routes>
      {/* Chat Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <ChatHome />
          </PrivateRoute>
        }
      />
      <Route
        path="/chats"
        element={
          <PrivateRoute>
            <ChatHome />
          </PrivateRoute>
        }
      />
      <Route
        path="/chats/conversations/:conversationIdStr"
        element={
          <PrivateRoute>
            <ChatHome />
          </PrivateRoute>
        }
      />

      {/* Friends Routes */}
      <Route
        path="/friends"
        element={
          <PrivateRoute>
            <FriendsLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="all" replace />} />
        <Route path="all" element={<AllFriends />} />
        <Route path="requests" element={<FriendRequests />} />
        <Route path="add" element={<AddFriends />} />
        <Route path="blocked" element={<BlockedUsers />} />
      </Route>

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="notifications" element={<NotificationSettings />} />
      </Route>

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoute;
