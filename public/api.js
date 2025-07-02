const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.tokenKey = 'auth_token';
    this.tokenExpiryKey = 'auth_token_expiry';
    this.encryptionKey = 'notemaker_app_key'; // Simple key for basic obfuscation
  }

  // Simple XOR encryption/decryption for token obfuscation
  // Note: This is not cryptographically secure, just basic obfuscation
  encrypt(text) {
    if (!text) return null;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
    }
    return btoa(result); // Base64 encode
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const text = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
      }
      return result;
    } catch (error) {
      console.error('Failed to decrypt token:', error);
      return null;
    }
  }

  // Always read token from localStorage
  getToken() {
    try {
      const encryptedToken = localStorage.getItem(this.tokenKey);
      if (!encryptedToken) return null;
      
      const token = this.decrypt(encryptedToken);
      if (!token) return null;

      // Check token expiry
      const expiry = localStorage.getItem(this.tokenExpiryKey);
      if (expiry && new Date() > new Date(expiry)) {
        console.log('Token expired, clearing from storage');
        this.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
      this.clearToken();
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        // Encrypt token before storing
        const encryptedToken = this.encrypt(token);
        localStorage.setItem(this.tokenKey, encryptedToken);
        
        // Set expiry time (24 hours from now)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24);
        localStorage.setItem(this.tokenExpiryKey, expiryTime.toISOString());
        
        console.log('Token stored securely with expiry:', expiryTime.toISOString());
      } else {
        this.clearToken();
      }
    } catch (error) {
      console.error('Error storing token in localStorage:', error);
      this.clearToken();
    }
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  // Get token expiry info
  getTokenExpiry() {
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    return expiry ? new Date(expiry) : null;
  }

  // Check if token will expire soon (within 1 hour)
  isTokenExpiringSoon() {
    const expiry = this.getTokenExpiry();
    if (!expiry) return false;
    
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return expiry < oneHourFromNow;
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
          console.log('401 Unauthorized - clearing token and triggering logout');
          this.clearToken();
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
    console.log('Logging out - clearing token from storage');
    this.clearToken();
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 