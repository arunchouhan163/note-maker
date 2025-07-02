const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 