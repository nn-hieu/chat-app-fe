import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ApiResponse, LoginResponse, User } from '../types/type';
import webSocketService from '../services/websocket.service'
import { authAPI } from '../services/auth.service';
import api from '../services/api.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<ApiResponse<LoginResponse>>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);

        // Connect to WebSocket
        webSocketService.connect(storedToken, parsedUser.id.toString()).catch((error) => {
          console.error('WebSocket connection error:', error);
          // If WebSocket fails, don't clear auth data
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    const response = await authAPI.login({ username, password });
    const data: ApiResponse<LoginResponse> = response.data;

    if (data.status === 200) {
      const { token: newToken, user: newUser } = data.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      await webSocketService.connect(newToken, newUser.id.toString()).catch(console.error);
    }

    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (webSocketService.isConnectedState()) {
      webSocketService.disconnect();
    }
  };

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log('axios interceptor fired', error);
        const status = error?.response?.status;
        if (status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => { api.interceptors.response.eject(interceptor); };
  }, []);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    // Cập nhật localStorage nếu cần
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};