const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  isAuthenticated() {
    return !!this.token;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired or invalid - but for login/register, we should still throw the error
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
        if (!isAuthEndpoint) {
          this.setToken(null);
          if (window.noteApp) {
            window.noteApp.handleLogout();
          }
          return;
        }
        // For auth endpoints, let it fall through to normal error handling
      }
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.log('Backend error response:', errorData); // Debug log
          
          // Extract the exact backend error message
          if (Array.isArray(errorData.message)) {
            // Handle validation errors that come as arrays
            errorMessage = errorData.message.join(', ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Note API calls
  async getNotes() {
    return this.makeRequest('/notes');
  }

  async getNoteById(id) {
    return this.makeRequest(`/notes/${id}`);
  }

  async createNote(noteData) {
    return this.makeRequest('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async updateNote(id, noteData) {
    return this.makeRequest(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  async deleteNote(id) {
    return this.makeRequest(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  async searchNotes(query) {
    return this.makeRequest(`/notes/search?q=${encodeURIComponent(query)}`);
  }

  async getArchivedNotes() {
    return this.makeRequest('/notes/archived');
  }

  async getTrashedNotes() {
    return this.makeRequest('/notes/trash');
  }

  async getAllTags() {
    return this.makeRequest('/notes/tags');
  }

  async getDueDateNotes() {
    return this.makeRequest('/notes/due-dates');
  }

  async getNotesByTag(tag) {
    return this.makeRequest(`/notes/tags/${encodeURIComponent(tag)}`);
  }

  async permanentlyDeleteNote(id) {
    return this.makeRequest(`/notes/${id}/permanent`, {
      method: 'DELETE',
    });
  }

  async restoreFromTrash(id) {
    return this.makeRequest(`/notes/${id}/restore`, {
      method: 'PUT',
    });
  }

  // Auth API calls
  async login(email, password) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response && response.access_token) {
        this.setToken(response.access_token);
      }
      return response;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  }

  async register(email, password) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response && response.access_token) {
        this.setToken(response.access_token);
      }
      return response;
    } catch (error) {
      console.error('Register API error:', error);
      throw error;
    }
  }

  async getProfile() {
    return this.makeRequest('/auth/profile');
  }

  logout() {
    this.setToken(null);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 