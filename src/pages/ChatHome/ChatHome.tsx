import {
  ArrowLeftOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
  FileZipOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Image,
  Input,
  List,
  message,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
  Upload
} from 'antd';
import { throttle } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { SidebarSection } from '../../layouts/SidebarLayout/SidebarLayout';
import SidebarLayout from '../../layouts/SidebarLayout/SidebarLayout';
import { conversationsAPI } from '../../services/conversation.service';
import { messageAPI } from '../../services/message.service';
import { webSocketService } from '../../services/websocket.service';
import useConversationStore from '../../stores/conversationStore';
import useFriendsStore from '../../stores/friendsStore';
import type { Attachment, Message, SendMessageRequest, TypingRequest, TypingStatus, UploadedFileInfo, User, UserOnlineStatus } from '../../types/type';
import { downloadAttachment, formatFileSize, isValid } from '../../utils/file.util';
import { formatTime, formatTimeAgo, TimePatterns } from '../../utils/time.util';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ChatHome: React.FC = () => {
  const { user } = useAuth();
  const { conversationIdStr } = useParams();
  const navigate = useNavigate();

  const conversationId = conversationIdStr ? Number(conversationIdStr) : null;

  // Zustand stores
  const {
    friends,
    loading: loadingFriends,
    loadFriends,
    updateFriendOnlineStatus,
  } = useFriendsStore();

  const {
    conversations,
    messages,
    draftMessages,
    selectedConversationId,
    loadingConversations,
    loadingMessages,
    loadConversations,
    loadConversationMessages,
    loadMoreMessages,
    addMessage,
    updateConversationWithNewMessage,
    setDraftMessage,
    clearDraftMessage,
    setSelectedConversation,
    addOrUpdateConversation,
    updateParticipantOnlineStatus,
    getConversationById,
    getOtherParticipant,
    isConversationLoaded,
    getConversationPagination,
  } = useConversationStore();

  const targetConversationId = useMemo(
    () => conversationId || selectedConversationId,
    [conversationId, selectedConversationId]
  );

  // Search states
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Typing status states
  const [typingUsers, setTypingUsers] = useState<Record<number, Record<number, boolean>>>({});
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);

  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for typing and scrolling functionality
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if this is the first load to scroll to bottom
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  // Track if user has manually scrolled up
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  // Get current conversation data using store with URL priority
  const selectedConversationData = getConversationById(targetConversationId);

  const otherUser: User | undefined = user ? getOtherParticipant(targetConversationId, user.id) : undefined;

  const currentMessages: Message[] = messages[targetConversationId] || [];

  const currentDraftMessage = draftMessages[targetConversationId] || '';

  const isLoadingCurrentMessages = loadingMessages[targetConversationId] || false;

  const currentPagination = getConversationPagination(targetConversationId);

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

  // Helper function to get file icon based on type and format
  const getFileIcon = useCallback((attachment: Attachment | UploadedFileInfo) => {
    let type: string, format: string;

    if ('type' in attachment && 'format' in attachment) {
      // Attachment object
      type = attachment.type;
      format = attachment.format;
    } else {
      // UploadedFileInfo object
      const fileType = attachment.type || attachment.name.split('.').pop() || '';
      if (fileType.startsWith('image/')) {
        type = 'IMAGE';
        format = fileType;
      } else if (fileType.startsWith('video/')) {
        type = 'VIDEO';
        format = fileType;
      } else if (fileType.startsWith('audio/')) {
        type = 'AUDIO';
        format = fileType;
      } else {
        type = 'DOCUMENT';
        format = fileType;
      }
    }

    switch (type) {
      case 'IMAGE':
        return <FileImageOutlined className="text-blue-500" />;
      case 'VIDEO':
        return <FileImageOutlined className="text-red-500" />;
      case 'AUDIO':
        return <FileImageOutlined className="text-green-500" />;
      default:
        // Handle specific formats
        const lowerFormat = format.toLowerCase();
        if (lowerFormat.includes('pdf')) {
          return <FilePdfOutlined className="text-red-600" />;
        } else if (lowerFormat.includes('doc') || lowerFormat.includes('docx')) {
          return <FileWordOutlined className="text-blue-600" />;
        } else if (lowerFormat.includes('xls') || lowerFormat.includes('xlsx')) {
          return <FileExcelOutlined className="text-green-600" />;
        } else if (lowerFormat.includes('ppt') || lowerFormat.includes('pptx')) {
          return <FilePptOutlined className="text-orange-600" />;
        } else if (lowerFormat.includes('zip') || lowerFormat.includes('rar') || lowerFormat.includes('7z')) {
          return <FileZipOutlined className="text-yellow-600" />;
        }
        return <FileOutlined className="text-gray-500" />;
    }
  }, []);

  // Handle file upload
  const handleUploadFiles = async (files: File[]) => {
    const validFiles: File[] = [];

    for (const file of files) {
      const valid = await isValid(file);
      if (valid) {
        validFiles.push(file);
      }
    }

    const newFiles: UploadedFileInfo[] = validFiles.map((file: File) => ({
      uid: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      url: URL.createObjectURL(file),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Handle file removal
  const handleFileRemove = useCallback((uid: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.uid === uid);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.uid !== uid);
    });
  }, []);

  // Handle clear all files
  const handleClearAllFiles = useCallback(() => {
    uploadedFiles.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    setUploadedFiles([]);
  }, [uploadedFiles]);

  // Render uploaded file preview
  const renderUploadedFilePreview = useCallback((file: UploadedFileInfo) => {
    const isImage = file.type.startsWith('image/');

    return (
      <div key={file.uid} className="relative bg-gray-50 border border-gray-200 rounded-lg p-1 hover:bg-gray-100 transition-colors w-62 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isImage && file.url ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 text-lg">
              {getFileIcon(file)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Tooltip title={file.name}>
              <Text className="text-sm font-medium block truncate text-gray-800">
                {file.name}
              </Text>
            </Tooltip>
            <Text className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </Text>
          </div>

          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleFileRemove(file.uid)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          />
        </div>
      </div>
    );
  }, [getFileIcon, formatFileSize, handleFileRemove]);

  // Render attachment component (for messages)
  const renderAttachment = useCallback((attachment: Attachment, isOwnMessage: boolean) => {
    const { type, url, originalFilename, size } = attachment;

    if (type === 'IMAGE') {
      return (
        <div className="w-24 h-24 overflow-hidden rounded-lg bg-gray-200 flex-shrink-0">
          <Image
            src={url}
            alt={originalFilename}
            className='!h-24 !w-24 !object-cover !cursor-pointer'
            preview={{
              mask: null,
            }}
          />
        </div>
      );
    }

    // For non-image files, render as downloadable card (unchanged)
    return (
      <Card
        size="small"
        className={`!rounded-lg !cursor-pointer !transition-all !duration-200 hover:!shadow-md ${isOwnMessage
          ? '!bg-blue-400 !border-none hover:!bg-blue-300'
          : '!bg-gray-100 !border-gray-200 hover:!bg-gray-50'
          }`}
        onClick={() => downloadAttachment(attachment.id)}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <div className="flex items-center gap-3">
          <div className="text-lg">
            {getFileIcon(attachment)}
          </div>
          <div className="flex-1 min-w-0">
            <Tooltip title={originalFilename}>
              <Text
                className={`!text-sm !font-medium !block !truncate ${isOwnMessage ? '!text-white' : '!text-gray-800'
                  }`}
              >
                {originalFilename}
              </Text>
            </Tooltip>
            <Text
              className={`!text-xs ${isOwnMessage ? '!text-white !text-opacity-80' : '!text-gray-500'
                }`}
            >
              {formatFileSize(size)}
            </Text>
          </div>
          <DownloadOutlined
            className={`!text-sm ${isOwnMessage ? '!text-white !text-opacity-80' : '!text-gray-400'
              }`}
          />
        </div>
      </Card>
    );
  }, [getFileIcon]);

  // Render message content with attachments
  const renderMessageContent = useCallback((message: Message) => {
    const isOwnMessage: boolean = message.senderId === user?.id;
    const { content, attachments = [] } = message;

    // Separate images and other files
    const imageAttachments: Attachment[] = attachments.filter(att => att.type === 'IMAGE');
    const otherAttachments: Attachment[] = attachments.filter(att => att.type !== 'IMAGE');

    return (
      <Card
        size="small"
        className={`!rounded-2xl !shadow-md ${isOwnMessage
          ? "!bg-blue-500 !border-none"
          : "!bg-white !border !border-gray-200"
          }`}
        styles={{ body: { padding: "8px 12px" } }}
      >
        {/* Render images in dynamic grid based on image count */}
        {imageAttachments.length > 0 && (
          <div className={`grid gap-2 mb-2 grid-cols-3`}>
            {imageAttachments.map((attachment) => (
              <div key={attachment.id}>
                {renderAttachment(attachment, isOwnMessage)}
              </div>
            ))}
          </div>
        )}

        {/* Render other files vertically */}
        {otherAttachments.length > 0 && (
          <div className="space-y-2 mb-2">
            {otherAttachments.map((attachment) => (
              <div key={attachment.id}>
                {renderAttachment(attachment, isOwnMessage)}
              </div>
            ))}
          </div>
        )}

        {/* Render text content if exists */}
        {content && content.trim() && (
          <Text
            className={`${isOwnMessage ? "!text-white" : "!text-black"
              } whitespace-normal break-words`}
          >
            {content}
          </Text>
        )}

        {/* Message timestamp */}
        <div className="text-right mt-1">
          <Text
            className={`!text-xs ${isOwnMessage
              ? "!text-white !text-opacity-70"
              : "!text-gray-500"
              }`}
          >
            {formatTime(message.createdAt, TimePatterns.TIME)}
          </Text>
        </div>
      </Card>
    );
  }, [user?.id, renderAttachment]);

  // Scroll to bottom immediately without animation
  const scrollToBottomImmediate = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Scroll to bottom with smooth animation
  const scrollToBottomSmooth = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle infinite scroll for loading more messages (older messages)
  const handleScroll = useMemo(() => throttle(() => {
    const container = messagesContainerRef.current;
    if (!container || !targetConversationId) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const isAtTop = scrollTop <= 100;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 100;

    if (!isAtBottom && !hasUserScrolled) {
      setHasUserScrolled(true);
    } else if (isAtBottom && hasUserScrolled) {
      setHasUserScrolled(false);
    }

    if (isAtTop && currentPagination.hasMore && !currentPagination.isLoading) {
      const previousScrollHeight = scrollHeight;
      const previousScrollTop = scrollTop;

      loadMoreMessages(targetConversationId).then(() => {
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollOffset = newScrollHeight - previousScrollHeight;
            container.scrollTop = previousScrollTop + scrollOffset;
          }
        });
      });
    }
  }, 150),
    [targetConversationId, currentPagination, loadMoreMessages, hasUserScrolled]
  );

  // Typing status handler
  const handleTypingStatusChange = useCallback((conversationId: number, isTyping: boolean) => {
    if (!user?.id) return;

    const typingStatus: TypingRequest = {
      conversationId: conversationId,
      isTyping: isTyping
    };

    webSocketService.sendTypingStatus(typingStatus);
    setIsCurrentUserTyping(isTyping);
  }, [user?.id]);

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: number) => {
    // Clear typing status when switching conversations
    if (selectedConversationId && selectedConversationId !== conversationId && isCurrentUserTyping) {
      handleTypingStatusChange(selectedConversationId, false);
    }

    setSelectedConversation(conversationId);
    navigate(`/chats/conversations/${conversationId}`);

    // Reset scroll states when switching conversations
    setIsFirstLoad(true);
    setHasUserScrolled(false);

    // Clear uploaded files when switching conversations
    handleClearAllFiles();

    if (!isConversationLoaded(conversationId) && user) {
      loadConversationMessages(conversationId);
    }
  }, [selectedConversationId, isCurrentUserTyping, user, handleTypingStatusChange, setSelectedConversation, navigate, isConversationLoaded, loadConversationMessages, handleClearAllFiles]);

  // Handle friend selection from search
  const handleFriendSelect = useCallback(async (friend: User) => {
    if (!user) return;

    try {
      // Create or get existing conversation
      const response = await conversationsAPI.getOrCreateSingleConversation(friend.id);
      const conversation = response.data.data;

      // Add/update conversation in store
      addOrUpdateConversation(conversation);

      // Reset scroll states for new conversation
      setIsFirstLoad(true);
      setHasUserScrolled(false);

      // Clear uploaded files for new conversation
      handleClearAllFiles();

      // Load messages for this conversation
      await loadConversationMessages(conversation.id);

      // Update states
      setSelectedConversation(conversation.id);
      setIsSearchMode(false);
      setSearchQuery('');

      // Navigate to conversation
      navigate(`/chats/conversations/${conversation.id}`);
    } catch (error) {
      message.error('Failed to open conversation');
    }
  }, [user, addOrUpdateConversation, loadConversationMessages, setSelectedConversation, navigate, handleClearAllFiles]);

  // Handle section navigation
  const handleSectionSelect = useCallback((sectionKey: string) => {
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
  }, [navigate]);

  // Handle search input focus/blur
  const handleSearchFocus = useCallback(() => {
    setIsSearchMode(true);
    if (friends.length === 0) {
      loadFriends(user?.id!);
    }
  }, [friends.length, loadFriends, user?.id]);

  const handleSearchBlur = useCallback(() => {
    // Delay hiding to allow clicking on friend items
    setTimeout(() => {
      if (!searchQuery) {
        setIsSearchMode(false);
      }
    }, 100);
  }, [searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle back from search
  const handleBackFromSearch = useCallback(() => {
    setIsSearchMode(false);
    setSearchQuery('');
  }, []);

  // Set selectedConversationId from URL immediately
  useEffect(() => {
    if (conversationId) {
      if (conversationId !== selectedConversationId) {
        setSelectedConversation(conversationId);
        // Reset scroll states when URL changes
        setIsFirstLoad(true);
        setHasUserScrolled(false);
      }
    } else {
      // if URL is /chats
      setSelectedConversation(0);
    }
  }, [targetConversationId, setSelectedConversation]);

  useEffect(() => {
    if (!user?.id) return;

    const initializeConversations = async () => {
      if (conversations.length === 0 && !loadingConversations) {
        await loadConversations();
      }
    };

    const initializeConversationMessages = async () => {
      if (targetConversationId && !isConversationLoaded(targetConversationId)) {
        await loadConversationMessages(targetConversationId);
      }
    };

    initializeConversations();
    initializeConversationMessages();
  }, [user?.id, conversations.length, loadingConversations, targetConversationId, loadConversations, loadConversationMessages]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!user?.id) return;

    const listenNewMessage = (messageData: Message) => {
      // Add message to store
      addMessage(messageData);

      // Update conversation with new message info
      updateConversationWithNewMessage(messageData);

      // Auto scroll to bottom for new messages if user hasn't manually scrolled up
      if (messageData.conversationId === targetConversationId && !hasUserScrolled) {
        requestAnimationFrame(() => scrollToBottomSmooth());
      }
    };

    const listenError = (error: string) => {
      message.error(error);
    };

    const listenUserOnlineStatus = (userOnlineStatus: UserOnlineStatus) => {
      // Update online status in conversation store
      updateParticipantOnlineStatus(userOnlineStatus.userId, userOnlineStatus.isOnline);

      // Update online status for friends in search using store
      updateFriendOnlineStatus(userOnlineStatus);
    };

    const listenTypingStatus = (typingStatus: TypingStatus) => {
      const userId = typingStatus.senderId.toString();
      const conversationId = typingStatus.conversationId;

      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          [userId]: typingStatus.isTyping,
        }
      }));
    };

    const unsubscribeListenNewMessage = webSocketService.onMessage(listenNewMessage);
    const unsubscribeListenError = webSocketService.onError(listenError);
    const unsubscribeListenUserOnlineStatus = webSocketService.onUserOnlineStatus(listenUserOnlineStatus);
    const unsubscribeListenTypingStatus = webSocketService.onTypingStatus(listenTypingStatus);

    return () => {
      unsubscribeListenNewMessage();
      unsubscribeListenError();
      unsubscribeListenUserOnlineStatus();
      unsubscribeListenTypingStatus();
    };
  }, [user?.id, addMessage, updateConversationWithNewMessage, updateParticipantOnlineStatus, updateFriendOnlineStatus, targetConversationId, hasUserScrolled, scrollToBottomSmooth]);

  // Clean up timeouts and stop typing on component unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when switching conversations
      if (targetConversationId && isCurrentUserTyping) {
        handleTypingStatusChange(targetConversationId, false);
      }
      // Clean up uploaded files URLs
      uploadedFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [targetConversationId, isCurrentUserTyping, handleTypingStatusChange, uploadedFiles]);

  // Auto scroll to bottom on first load and when messages change
  useEffect(() => {
    if (currentMessages.length > 0 && isFirstLoad) {
      requestAnimationFrame(() => {
        scrollToBottomImmediate();
        setIsFirstLoad(false);
      });
    }
  }, [currentMessages, isFirstLoad, scrollToBottomImmediate]);

  // Handle input change with optimized typing detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Save draft for current conversation
    if (targetConversationId) {
      setDraftMessage(targetConversationId, value);
    }

    if (!targetConversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      if (!isCurrentUserTyping) {
        handleTypingStatusChange(targetConversationId, true);
      }

      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStatusChange(targetConversationId, false);
      }, 2000);
    } else {
      if (isCurrentUserTyping) {
        handleTypingStatusChange(targetConversationId, false);
      }
    }
  }, [targetConversationId, setDraftMessage, isCurrentUserTyping, handleTypingStatusChange]);

  // Handle send message with optimized state management
  const handleSendMessage = useCallback(async () => {
    const messageContent = currentDraftMessage;
    const hasContent = messageContent.trim();
    const hasFiles = uploadedFiles.length > 0;

    if (!hasContent && !hasFiles) return;
    if (!targetConversationId || !user) return;

    // Stop typing and clear timeout first
    if (isCurrentUserTyping) {
      handleTypingStatusChange(targetConversationId, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Clear draft message and files immediately for better UX
    clearDraftMessage(targetConversationId);
    const filesToUpload = [...uploadedFiles];
    setUploadedFiles([]);

    // Reset user scroll state so new message scrolls to bottom
    setHasUserScrolled(false);

    try {
      setIsUploading(true);

      if (hasFiles) {
        // If there are files, use message service API
        const request: SendMessageRequest = {
          conversationId: targetConversationId,
          content: messageContent,
        };

        // Extract actual File objects from uploaded files
        const files = filesToUpload.map(fileInfo => fileInfo.file).filter(Boolean) as File[];

        await messageAPI.sendMessage(request, files);

        // Clean up file URLs after successful upload
        filesToUpload.forEach(file => {
          if (file.url) {
            URL.revokeObjectURL(file.url);
          }
        });
      } else {
        // If no files, use WebSocket for faster delivery
        const request: SendMessageRequest = {
          conversationId: targetConversationId,
          content: messageContent,
        };

        webSocketService.sendMessage(request);
      }

    } catch (error) {
      // Restore draft message and files on error
      setDraftMessage(targetConversationId, messageContent);
      setUploadedFiles(filesToUpload);
    } finally {
      setIsUploading(false);
    }
  }, [
    currentDraftMessage,
    uploadedFiles,
    targetConversationId,
    user,
    isCurrentUserTyping,
    handleTypingStatusChange,
    clearDraftMessage,
    setDraftMessage
  ]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Optimized typing indicator logic
  const isOtherUserTyping = useMemo(() => {
    if (!targetConversationId || !otherUser) return false;

    const conversationTypingUsers = typingUsers[targetConversationId] || {};
    return conversationTypingUsers[otherUser.id] || false;
  }, [typingUsers, targetConversationId, otherUser]);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    return friends.filter(friend =>
      friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  // Render typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (!isOtherUserTyping || !otherUser) return null;

    return (
      <Card
        size="small"
        className="!inline-block !rounded-2xl !bg-gray-100 !border !border-gray-200"
        styles={{ body: { padding: "6px 10px" } }}
      >
        <div className="flex items-center space-x-2">
          <Avatar
            size={24}
            src={otherUser.avatarUrl}
            icon={<UserOutlined />}
            className="!rounded-full"
          />
          <div className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-2xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }, [isOtherUserTyping, otherUser]);

  //Render friend list on sidebar content when searching
  const renderSearchingFriendList = useCallback(
    (friend: User) => (
      <List.Item
        onClick={() => handleFriendSelect(friend)}
        className="!cursor-pointer !transition-all !duration-200 hover:!bg-gray-50 !py-3 !px-4 !border-none"
      >
        <div className="flex items-center gap-3 w-full">
          <Badge dot={friend.isOnline} offset={[-8, 8]}>
            <Avatar
              size={32}
              src={friend.avatarUrl}
              icon={<UserOutlined />}
              className={`${friend.isOnline ? '!bg-green-500' : '!bg-gray-400'}`}
            />
          </Badge>
          <div className="flex justify-between items-center flex-1">
            <Text strong className="!text-sm">{friend.fullName}</Text>
          </div>
        </div>
      </List.Item>
    ), [handleFriendSelect]
  );

  // Render custom sidebar content for Chats section
  const renderChatsSidebarContent = useCallback(() => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {isSearchMode && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              size="small"
              onClick={handleBackFromSearch}
            />
          )}
          <Input
            placeholder={"Search friends..."}
            prefix={<SearchOutlined />}
            className="!rounded-full flex-1"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </div>
      </div>

      {isSearchMode ? (
        // Render friends list when in search mode
        <>
          {loadingFriends ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <List
                dataSource={filteredFriends}
                className="!border-none"
                renderItem={renderSearchingFriendList}
              />
            </div>
          )}
        </>
      ) : (
        // Render conversations list when not in search mode
        <>
          {loadingConversations ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <List
                dataSource={conversations}
                className="!border-none"
                renderItem={(conversation) => {
                  const conversationItemId = conversation.id;
                  const otherParticipant = conversation.participants.find(p => p.id !== user?.id);

                  if (!otherParticipant) return null;

                  const conversationTypingUsers = typingUsers[conversationItemId] || {};
                  const isParticipantTyping = conversationTypingUsers[otherParticipant.id] || false;

                  const isSelected = targetConversationId === conversationItemId;

                  return (
                    <List.Item
                      onClick={() => handleConversationSelect(conversationItemId)}
                      className={`
                        !cursor-pointer !transition-all !duration-200 hover:!bg-gray-50 !py-3 !px-4 !border-none
                        ${isSelected
                          ? '!bg-blue-50 !border-l-4 !border-l-blue-500'
                          : '!border-l-0'
                        }
                      `}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge dot={otherParticipant.isOnline} offset={[-8, 8]}>
                            <Avatar
                              size={48}
                              src={otherParticipant.avatarUrl}
                              icon={<UserOutlined />}
                              className={`${otherParticipant.isOnline ? '!bg-green-500' : '!bg-gray-400'}`}
                            />
                          </Badge>
                        }
                        title={
                          <div className="flex justify-between items-center">
                            <Text strong className="!text-sm">{otherParticipant.fullName}</Text>
                            <Text type="secondary" className="!text-xs">
                              {conversation.lastMessageTime && formatTimeAgo(conversation.lastMessageTime)}
                            </Text>
                          </div>
                        }
                        description={
                          <div className="flex justify-between items-center">
                            <Text
                              ellipsis
                              className={`!text-xs !flex-1 !mr-2 ${isParticipantTyping ? '!text-blue-600 !italic' : '!text-gray-600'}`}
                            >
                              {isParticipantTyping ? (
                                <span className="inline-flex items-center space-x-1 align-middle">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <span
                                      key={i}
                                      className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                                      style={{ animationDelay: `${i * 150}ms` }}
                                    />
                                  ))}
                                </span>
                              ) : (
                                `${conversation.lastSenderId && conversation.lastSenderId !== otherParticipant.id ? "You: " : ""}${conversation.lastMessage || ''}`
                              )}
                            </Text>
                            {conversation.unreadCount > 0 && !isParticipantTyping && (
                              <Badge count={conversation.unreadCount} size="small" />
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}

          {!loadingConversations && conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageOutlined className="text-4xl text-gray-300 mb-4" />
              <Text type="secondary">No conversations yet</Text>
            </div>
          )}
        </>
      )}
    </div>
  ), [
    isSearchMode,
    searchQuery,
    handleBackFromSearch,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    loadingFriends,
    filteredFriends,
    handleFriendSelect,
    loadingConversations,
    conversations,
    user?.id,
    typingUsers,
    conversationId,
    selectedConversationId,
    handleConversationSelect,
    formatTimeAgo
  ]);

  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    currentMessages.forEach((msg) => {
      const dayKey = new Date(msg.createdAt).toDateString();
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(msg);
    });
    return groups;
  }, [currentMessages]);

  // Render main content
  const renderMainContent = useCallback(() => {
    if (loadingConversations || (!selectedConversationData && targetConversationId)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <Spin size="large" />
            <div className="mt-4">
              <Text type="secondary">Loading conversation...</Text>
            </div>
          </div>
        </div>
      );
    }

    if (!selectedConversationData || !otherUser) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageOutlined className="text-4xl text-gray-400" />
            </div>
            <Title level={4} type="secondary">Select a conversation</Title>
            <Text type="secondary">Choose a friend to start messaging</Text>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="bg-white px-6 border-b border-gray-200 flex items-center justify-between h-16">
          <Space>
            <Badge dot={otherUser.isOnline} offset={[-8, 8]}>
              <Avatar
                size={40}
                src={otherUser.avatarUrl}
                icon={<UserOutlined />}
                className={`${otherUser.isOnline ? '!bg-green-500' : '!bg-gray-400'}`}
              />
            </Badge>
            <div className="flex flex-col">
              <Text strong className="!text-base !leading-5">{otherUser.username}</Text>
              <Text type="secondary" className="!text-xs !leading-4 !flex !items-center !gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${otherUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                ></span>
                {otherUser.isOnline ? 'Online' : 'Offline'}
              </Text>
            </div>
          </Space>
          <Button type="text" icon={<MoreOutlined />} />
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-auto bg-gray-50"
          style={{ scrollBehavior: isFirstLoad ? 'auto' : 'smooth' }}
        >
          <div className="mx-auto">
            {/* Loading indicator for older messages at top */}
            {currentPagination.isLoading && (
              <div className="flex justify-center items-center py-4">
                <Spin size="small" />
                <Text type="secondary" className="ml-2 text-xs">Loading older messages...</Text>
              </div>
            )}

            {isLoadingCurrentMessages && currentMessages.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="large" />
                <Text type="secondary" className="ml-4">Loading messages...</Text>
              </div>
            ) : (
              <>
                {Object.entries(groupedMessages).map(([dayKey, msgs]) => (
                  <div key={dayKey}>
                    {/* Header */}
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                        {formatTime(msgs[0].createdAt, TimePatterns.DATE)}
                      </span>
                    </div>

                    {/* Messages in date */}
                    {msgs.map((message: Message) => (
                      <div key={message.id} className="mb-4">
                        <Row justify={message.senderId === user?.id ? "end" : "start"}>
                          <Col className="!min-w-1/4 !max-w-1/2">
                            {renderMessageContent(message)}
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Typing Indicator */}
                {renderTypingIndicator()}
              </>
            )}

            {!isLoadingCurrentMessages && currentMessages.length === 0 && (
              <div className="text-center py-8">
                <Text type="secondary">No messages yet. Start a conversation!</Text>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* File Upload Preview Area */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white border-t border-gray-200 pb-1 pt-2 max-h-48 overflow-auto">
            <div className="pl-4 pr-4 mx-auto">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-sm font-medium text-gray-700">
                  Attached files ({uploadedFiles.length})
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleClearAllFiles}
                  className="text-gray-400 hover:text-red-500"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {uploadedFiles.map(renderUploadedFilePreview)}
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 justify-center">
              {/* File upload button */}
              <Upload
                multiple
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadFiles([file]);
                  return false;
                }}
                accept="*/*"
              >
                <Button
                  type="text"
                  icon={<PaperClipOutlined />}
                  className="flex-shrink-0 h-auto min-h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  disabled={isUploading}
                />
              </Upload>

              {/* Message input */}
              <div className="flex-1">
                <TextArea
                  value={currentDraftMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  className="!rounded-2xl !resize-none"
                />
              </div>

              {/* Send button */}
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={(!currentDraftMessage.trim() && uploadedFiles.length === 0) || isUploading}
                loading={isUploading}
                className="!h-auto !rounded-full !min-w-11 flex-shrink-0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    conversationId,
    selectedConversationId,
    loadingConversations,
    selectedConversationData,
    otherUser,
    currentPagination,
    isLoadingCurrentMessages,
    currentMessages,
    user?.id,
    handleScroll,
    groupedMessages,
    renderMessageContent,
    renderTypingIndicator,
    uploadedFiles,
    handleClearAllFiles,
    renderUploadedFilePreview,
    handleUploadFiles,
    isUploading,
    currentDraftMessage,
    handleInputChange,
    handleKeyPress,
    handleSendMessage,
    isFirstLoad,
    formatTime
  ]);

  return (
    <SidebarLayout
      sections={sections}
      selectedSection="chats"
      onSectionSelect={handleSectionSelect}
      siderWidth={300}
      customSidebarContent={renderChatsSidebarContent()}
    >
      {renderMainContent()}
    </SidebarLayout>
  );
};

export default ChatHome;