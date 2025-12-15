/**
 * API Service for Backend Communication
 * Handles authentication and project CRUD operations
 */

// @ts-ignore - Vite env
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

// Token management
let authToken: string | null = localStorage.getItem('fibo_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('fibo_token', token);
  } else {
    localStorage.removeItem('fibo_token');
  }
};

export const getAuthToken = () => authToken;

// User data management (for faster session restore)
export const setStoredUser = (user: { id: string; name: string; email: string; isDemo: boolean } | null) => {
  if (user) {
    localStorage.setItem('fibo_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('fibo_user');
  }
};

export const getStoredUser = (): { id: string; name: string; email: string; isDemo: boolean } | null => {
  try {
    const stored = localStorage.getItem('fibo_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// API request helper with timeout
const apiRequest = async (endpoint: string, options: RequestInit = {}, timeoutMs: number = 15000) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Server may be starting up, please try again.');
    }
    throw error;
  }
};

// ============ AUTH API ============

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    isDemo: boolean;
  };
}

export const authAPI = {
  signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    setAuthToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  demoLogin: async (): Promise<AuthResponse> => {
    const data = await apiRequest('/auth/demo', {
      method: 'POST'
    });
    setAuthToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },

  logout: () => {
    setAuthToken(null);
    setStoredUser(null);
  }
};


// ============ PROJECTS API ============

import { Project, StudioConfig, StudioObject, GeneratedImage, ConsistencySettings } from '../types';

export interface ProjectSummary {
  id: string;
  name: string;
  lastUpdated: number;
  moodDescription?: string;
  objectCount: number;
  imageCount: number;
}

export interface ProjectStats {
  totalProjects: number;
  totalImages: number;
  totalObjects: number;
}

export const projectsAPI = {
  // Get all projects for current user
  getAll: async (): Promise<ProjectSummary[]> => {
    return apiRequest('/projects');
  },

  // Get single project by ID
  getById: async (id: string): Promise<Project> => {
    return apiRequest(`/projects/${id}`);
  },

  // Create new project
  create: async (data: {
    name: string;
    config?: StudioConfig;
    objects?: StudioObject[];
    consistencySettings?: ConsistencySettings;
  }): Promise<Project> => {
    return apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Update project
  update: async (id: string, data: Partial<{
    name: string;
    config: StudioConfig;
    objects: StudioObject[];
    images: GeneratedImage[];
    consistencySettings: ConsistencySettings;
  }>): Promise<Project> => {
    return apiRequest(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Delete project
  delete: async (id: string): Promise<void> => {
    return apiRequest(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Add image to project
  addImage: async (projectId: string, image: {
    url: string;
    promptUsed: string;
    objectName: string;
  }): Promise<GeneratedImage> => {
    return apiRequest(`/projects/${projectId}/images`, {
      method: 'POST',
      body: JSON.stringify(image)
    });
  },

  // Get user stats
  getStats: async (): Promise<ProjectStats> => {
    return apiRequest('/projects/stats/summary');
  }
};

// ============ CONNECTION CHECK ============

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
