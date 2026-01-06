const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Auth state
let authToken: string | null = localStorage.getItem('authToken');
let currentUser: any = null;

// Get auth headers
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

// Handle API errors
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Auth API
export const authAPI = {
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse(response);
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken!);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return data;
  },

  async register(username: string, password: string, role?: string) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });

    return handleResponse(response);
  },

  async getCurrentUser() {
    if (!authToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    const user = await handleResponse(response);
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return user;
  },

  logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  },

  isAuthenticated(): boolean {
    return !!authToken;
  },

  getCurrentUserSync() {
    if (!currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    }
    return currentUser;
  },

  isAdmin(): boolean {
    const user = this.getCurrentUserSync();
    return user?.role === 'admin';
  }
};

// Stock Ideas API
export const ideasAPI = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/ideas`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async create(ideaData: any) {
    const response = await fetch(`${API_BASE_URL}/ideas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(ideaData),
    });
    return handleResponse(response);
  },

  async update(id: string, ideaData: any) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(ideaData),
    });
    return handleResponse(response);
  },

  async updatePrice(id: string, currentPrice: number) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}/price`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPrice }),
    });
    return handleResponse(response);
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getTags() {
    const response = await fetch(`${API_BASE_URL}/ideas/meta/tags`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async checkDuplicate(ticker: string) {
    const response = await fetch(`${API_BASE_URL}/ideas/check-duplicate/${ticker}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateRating(id: string, rating: number, ratingNotes?: string) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}/rating`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rating, ratingNotes }),
    });
    return handleResponse(response);
  },

  async updateExitStrategy(id: string, stopLossPrice?: number, profitTargetPrice?: number, trailingStopPct?: number) {
    const response = await fetch(`${API_BASE_URL}/ideas/${id}/exit-strategy`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stopLossPrice, profitTargetPrice, trailingStopPct }),
    });
    return handleResponse(response);
  }
};

// Stocks API
export const stocksAPI = {
  async getStockData(ticker: string) {
    const response = await fetch(`${API_BASE_URL}/stocks/${ticker}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getCurrentPrice(ticker: string) {
    const response = await fetch(`${API_BASE_URL}/stocks/${ticker}/price`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};

// Scraper API
export const scraperAPI = {
  async getPendingIdeas() {
    const response = await fetch(`${API_BASE_URL}/scraper/pending`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async triggerScrape(source: 'all' | 'reddit' | 'twitter' | 'rss' | 'vic' | 'news') {
    const response = await fetch(`${API_BASE_URL}/scraper/scrape`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ source }),
    });
    return handleResponse(response);
  },

  async approveIdea(id: number) {
    const response = await fetch(`${API_BASE_URL}/scraper/approve/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async rejectIdea(id: number) {
    const response = await fetch(`${API_BASE_URL}/scraper/reject/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/scraper/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};

// Alerts API
export const alertsAPI = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async create(alertData: any) {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(alertData),
    });
    return handleResponse(response);
  },

  async delete(id: number) {
    const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};

// Initialize auth state on load
const storedToken = localStorage.getItem('authToken');
const storedUser = localStorage.getItem('currentUser');

if (storedToken && storedUser) {
  authToken = storedToken;
  try {
    currentUser = JSON.parse(storedUser);
  } catch (e) {
    console.error('Failed to parse stored user');
  }
}
