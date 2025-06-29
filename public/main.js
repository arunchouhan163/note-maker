import apiService from './api.js';

class NoteApp {
  constructor() {
    this.notes = [];
    this.currentView = 'all';
    this.selectedColor = '#ffffff';
    this.editingNote = null;
    this.searchTimeout = null;
    
    this.initializeElements();
    this.bindEvents();
    this.loadNotes();
    this.loadTags();
  }

  initializeElements() {
    this.notesGrid = document.getElementById('notesGrid');
    this.searchInput = document.getElementById('searchInput');
    this.createNoteBtn = document.getElementById('createNoteBtn');
    this.noteModal = document.getElementById('noteModal');
    this.noteForm = document.getElementById('noteForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.noteTitle = document.getElementById('noteTitle');
    this.noteContent = document.getElementById('noteContent');
    this.noteTags = document.getElementById('noteTags');
    this.colorPicker = document.getElementById('colorPicker');
    this.closeModalBtn = document.getElementById('closeModal');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.tagsList = document.getElementById('tagsList');
  }

  bindEvents() {
    // Search functionality
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });

    // Modal events
    this.createNoteBtn.addEventListener('click', () => this.openCreateModal());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelBtn.addEventListener('click', () => this.closeModal());
    this.noteForm.addEventListener('submit', (e) => this.handleSaveNote(e));

    // Color picker
    this.colorPicker.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-option')) {
        this.selectColor(e.target);
      }
    });

    // Sidebar navigation
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.handleViewChange(e.currentTarget.dataset.view);
      });
    });

    // Close modal on outside click
    this.noteModal.addEventListener('click', (e) => {
      if (e.target === this.noteModal) {
        this.closeModal();
      }
    });
  }

  async loadNotes() {
    try {
      let notes;
      switch (this.currentView) {
        case 'archived':
          notes = await apiService.getArchivedNotes();
          break;
        case 'trash':
          notes = await apiService.getTrashedNotes();
          break;
        default:
          notes = await apiService.getNotes();
      }
      this.notes = notes;
      this.renderNotes();
    } catch (error) {
      console.error('Error loading notes:', error);
      this.showEmptyState('Error loading notes');
    }
  }

  async loadTags() {
    try {
      const tags = await apiService.getAllTags();
      this.renderTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      // Don't show error for tags, just leave the tags section empty
      this.tagsList.innerHTML = '<div style="padding: 0 20px; color: #9aa0a6; font-size: 12px;">No tags yet</div>';
    }
  }

  renderNotes() {
    if (this.notes.length === 0) {
      this.showEmptyState();
      return;
    }

    this.notesGrid.innerHTML = this.notes.map(note => this.createNoteCard(note)).join('');
    
    // Add event listeners to note cards
    this.notesGrid.querySelectorAll('.note-card').forEach((card, index) => {
      const note = this.notes[index];
      
      // Edit note
      card.addEventListener('click', () => this.openEditModal(note));
      
      // Action buttons
      const archiveBtn = card.querySelector('.archive-btn');
      const deleteBtn = card.querySelector('.delete-btn');
      const restoreBtn = card.querySelector('.restore-btn');
      
      if (archiveBtn) {
        archiveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleArchive(note);
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteNote(note);
        });
      }
      
      if (restoreBtn) {
        restoreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.restoreNote(note);
        });
      }
    });
  }

  createNoteCard(note) {
    const isTrashed = this.currentView === 'trash';
    const isArchived = this.currentView === 'archived';
    
    return `
      <div class="note-card" style="background-color: ${note.backgroundColor || '#ffffff'}">
        <div class="note-title">${this.escapeHtml(note.title)}</div>
        <div class="note-content">${this.escapeHtml(note.content)}</div>
        
        ${note.tags && note.tags.length > 0 ? `
          <div class="note-tags">
            ${note.tags.map(tag => `<span class="note-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="note-actions">
          <div class="note-date">
            ${new Date(note.updatedAt).toLocaleDateString()}
          </div>
          <div>
            ${!isTrashed ? `
              <button class="note-action-btn archive-btn" title="${note.isArchived ? 'Unarchive' : 'Archive'}">
                <i class="fas fa-${note.isArchived ? 'unarchive' : 'archive'}"></i>
              </button>
              <button class="note-action-btn delete-btn" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            ` : `
              <button class="note-action-btn restore-btn" title="Restore">
                <i class="fas fa-undo"></i>
              </button>
              <button class="note-action-btn delete-btn" title="Delete permanently">
                <i class="fas fa-trash-alt"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  renderTags(tags) {
    if (!tags || tags.length === 0) {
      this.tagsList.innerHTML = '<div style="padding: 0 20px; color: #9aa0a6; font-size: 12px;">No tags yet</div>';
      return;
    }

    this.tagsList.innerHTML = tags.map(tag => `
      <div class="tag-item" data-tag="${tag}">
        <i class="fas fa-tag"></i>
        <span>${this.escapeHtml(tag)}</span>
      </div>
    `).join('');

    // Add click events to tags
    this.tagsList.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleTagClick(item.dataset.tag);
      });
    });
  }

  async handleSearch(query) {
    if (!query.trim()) {
      this.loadNotes();
      return;
    }

    try {
      this.notes = await apiService.searchNotes(query);
      this.renderNotes();
    } catch (error) {
      console.error('Error searching notes:', error);
    }
  }

  async handleTagClick(tag) {
    try {
      this.notes = await apiService.getNotesByTag(tag);
      this.renderNotes();
      this.updateActiveView('tag');
    } catch (error) {
      console.error('Error loading notes by tag:', error);
    }
  }

  handleViewChange(view) {
    this.currentView = view;
    this.updateActiveView(view);
    this.loadNotes();
  }

  updateActiveView(view) {
    // Update sidebar active state
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    
    if (view !== 'tag') {
      document.querySelector(`[data-view="${view}"]`).classList.add('active');
    }
  }

  openCreateModal() {
    this.editingNote = null;
    this.modalTitle.textContent = 'Create Note';
    this.noteForm.reset();
    this.selectColor(this.colorPicker.querySelector('[data-color="#ffffff"]'));
    this.noteModal.style.display = 'block';
  }

  openEditModal(note) {
    this.editingNote = note;
    this.modalTitle.textContent = 'Edit Note';
    this.noteTitle.value = note.title;
    this.noteContent.value = note.content;
    this.noteTags.value = note.tags ? note.tags.join(', ') : '';
    this.selectColor(this.colorPicker.querySelector(`[data-color="${note.backgroundColor || '#ffffff'}"]`));
    this.noteModal.style.display = 'block';
  }

  closeModal() {
    this.noteModal.style.display = 'none';
    this.editingNote = null;
    // Reset form to clear any error states
    this.noteForm.reset();
  }

  selectColor(colorElement) {
    this.colorPicker.querySelectorAll('.color-option').forEach(option => {
      option.classList.remove('selected');
    });
    colorElement.classList.add('selected');
    this.selectedColor = colorElement.dataset.color;
  }

  async handleSaveNote(e) {
    e.preventDefault();
    
    const noteData = {
      title: this.noteTitle.value.trim(),
      content: this.noteContent.value.trim(),
      tags: this.noteTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
      backgroundColor: this.selectedColor
    };

    // Validate tags limit
    if (noteData.tags.length > 9) {
      alert('Maximum 9 tags allowed');
      return;
    }

    try {
      if (this.editingNote) {
        await apiService.updateNote(this.editingNote._id, noteData);
      } else {
        await apiService.createNote(noteData);
      }
      
      this.closeModal();
      this.loadNotes();
      this.loadTags();
    } catch (error) {
      console.error('Error saving note:', error);
      // Don't close modal on error, let user try again
      alert('Error saving note. Please try again.');
    }
  }

  async toggleArchive(note) {
    try {
      await apiService.updateNote(note._id, { isArchived: !note.isArchived });
      this.loadNotes();
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  }

  async deleteNote(note) {
    if (this.currentView === 'trash') {
      if (confirm('Are you sure you want to permanently delete this note?')) {
        try {
          await apiService.permanentlyDeleteNote(note._id);
          this.loadNotes();
        } catch (error) {
          console.error('Error permanently deleting note:', error);
        }
      }
    } else {
      if (confirm('Are you sure you want to delete this note?')) {
        try {
          await apiService.deleteNote(note._id);
          this.loadNotes();
        } catch (error) {
          console.error('Error deleting note:', error);
        }
      }
    }
  }

  async restoreNote(note) {
    try {
      await apiService.restoreFromTrash(note._id);
      this.loadNotes();
    } catch (error) {
      console.error('Error restoring note:', error);
    }
  }

  showEmptyState(message = null) {
    let content = '';
    
    switch (this.currentView) {
      case 'archived':
        content = `
          <div class="empty-state">
            <i class="fas fa-archive"></i>
            <h3>No archived notes</h3>
            <p>Notes you archive appear here</p>
          </div>
        `;
        break;
      case 'trash':
        content = `
          <div class="empty-state">
            <i class="fas fa-trash"></i>
            <h3>No notes in trash</h3>
            <p>Deleted notes appear here for 30 days</p>
          </div>
        `;
        break;
      default:
        content = `
          <div class="empty-state">
            <i class="fas fa-lightbulb"></i>
            <h3>${message || 'No notes yet'}</h3>
            <p>${message || 'Create your first note to get started'}</p>
          </div>
        `;
    }
    
    this.notesGrid.innerHTML = content;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NoteApp();
}); 