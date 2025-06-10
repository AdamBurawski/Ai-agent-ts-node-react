import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: string;
}

export interface AppState {
  // Global loading state
  isLoading: boolean;
  
  // Global error state
  error: string | null;
  
  // Chat messages (global for sharing between components)
  chatMessages: ChatMessage[];
  
  // Current active tab
  activeTab: string;
  
  // Global settings
  settings: {
    theme: 'light' | 'dark';
    language: 'en' | 'pl';
    autoSave: boolean;
  };
}

// Action Types
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT_MESSAGES' }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: AppState = {
  isLoading: false,
  error: null,
  chatMessages: [],
  activeTab: 'agent',
  settings: {
    theme: 'light',
    language: 'pl',
    autoSave: true,
  },
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };
    
    case 'CLEAR_CHAT_MESSAGES':
      return { ...state, chatMessages: [] };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper functions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatMessages: () => void;
  setActiveTab: (tab: string) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const chatMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: chatMessage });
  };

  const clearChatMessages = () => {
    dispatch({ type: 'CLEAR_CHAT_MESSAGES' });
  };

  const setActiveTab = (tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  const updateSettings = (settings: Partial<AppState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setLoading,
    setError,
    addChatMessage,
    clearChatMessages,
    setActiveTab,
    updateSettings,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Selectors (for performance optimization)
export const useAppSelector = <T>(selector: (state: AppState) => T): T => {
  const { state } = useAppContext();
  return selector(state);
};

// Common selectors
export const useLoading = () => useAppSelector(state => state.isLoading);
export const useError = () => useAppSelector(state => state.error);
export const useChatMessages = () => useAppSelector(state => state.chatMessages);
export const useActiveTab = () => useAppSelector(state => state.activeTab);
export const useSettings = () => useAppSelector(state => state.settings); 