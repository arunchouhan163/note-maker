import apiService from './api.js';

class NoteApp {
  constructor() {
    this.notes = [];
    this.currentView = 'all';
    this.selectedColor = '#ffffff';
    this.editingNote = null;
    this.searchTimeout = null;
    this.todoItems = [];
    this.completedItems = new Set();
    this.autosaveTimeout = null;
    this.isAutoSaving = false;
    this.currentUser = null;
    this.lastSyncTime = 0;
    this.syncCooldown = 2000; // 2 second cooldown between syncs
    this.pendingAction = null; // Track pending actions after sign-in
    
    this.initializeElements();
    this.bindEvents();
    this.initializeSidebar();
    this.checkAuthentication();
  }

  initializeElements() {
    this.notesGrid = document.getElementById('notesGrid');
    this.searchInput = document.getElementById('searchInput');
    this.createNoteBtn = document.getElementById('createNoteBtn');
    this.noteModal = document.getElementById('noteModal');
    this.noteForm = document.getElementById('noteForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.noteTitle = document.getElementById('noteTitle');
    this.newTodoItem = document.getElementById('newTodoItem');
    this.addTodoBtn = document.getElementById('addTodoBtn');
    this.todoItemsList = document.getElementById('todoItemsList');
    this.noteTags = document.getElementById('noteTags');
    this.noteDueDate = document.getElementById('noteDueDate');
    this.dueDateStatus = document.getElementById('dueDateStatus');
    this.colorPicker = document.getElementById('colorPicker');
    this.closeModalFooterBtn = document.getElementById('closeModalFooter');
    this.autosaveStatus = document.getElementById('autosaveStatus');
    this.tagsList = document.getElementById('tagsList');
    this.overdueList = document.getElementById('overdueList');
    this.upcomingList = document.getElementById('upcomingList');
    this.overdueCount = document.getElementById('overdueCount');
    this.upcomingCount = document.getElementById('upcomingCount');
    
    // Sidebar elements
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    
    // Auth elements
    this.userInfo = document.getElementById('userInfo');
    this.userEmail = document.getElementById('userEmail');
    this.signInBtn = document.getElementById('signInBtn');
    this.signInModal = document.getElementById('signInModal');
    this.signUpModal = document.getElementById('signUpModal');
    this.profileModal = document.getElementById('profileModal');
    this.signInForm = document.getElementById('signInForm');
    this.signUpForm = document.getElementById('signUpForm');
    this.signInEmail = document.getElementById('signInEmail');
    this.signInPassword = document.getElementById('signInPassword');
    this.signUpEmail = document.getElementById('signUpEmail');
    this.signUpPassword = document.getElementById('signUpPassword');
    this.signInError = document.getElementById('signInError');
    this.signUpError = document.getElementById('signUpError');
    this.profileEmail = document.getElementById('profileEmail');
    this.profileJoined = document.getElementById('profileJoined');
    this.signInPasswordToggle = document.getElementById('signInPasswordToggle');
    this.signUpPasswordToggle = document.getElementById('signUpPasswordToggle');
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
    this.closeModalFooterBtn.addEventListener('click', () => this.closeModalWithSave());
    
    // Autosave events
    this.noteTitle.addEventListener('input', () => this.scheduleAutosave());
    this.noteTags.addEventListener('input', () => this.scheduleAutosave());
    this.noteDueDate.addEventListener('change', () => {
      this.updateDueDateStatus();
      this.scheduleAutosave();
    });

    // Color picker
    this.colorPicker.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-option')) {
        this.selectColor(e.target);
        this.scheduleAutosave();
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
        this.closeModalWithSave();
      }
    });

    // Todo item events
    this.addTodoBtn.addEventListener('click', () => this.addTodoItem());
    this.newTodoItem.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTodoItem();
      }
    });

    // Auth events
    this.signInBtn.addEventListener('click', () => this.openSignInModal());
    this.userInfo.addEventListener('click', () => this.openProfileModal());
    this.signInForm.addEventListener('submit', (e) => this.handleSignIn(e));
    this.signUpForm.addEventListener('submit', (e) => this.handleSignUp(e));
    
    // Modal close events
    document.getElementById('cancelSignIn').addEventListener('click', () => this.closeSignInModal());
    document.getElementById('cancelSignUp').addEventListener('click', () => this.closeSignUpModal());
    document.getElementById('closeProfile').addEventListener('click', () => this.closeProfileModal());
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    
    // Modal switch events
    document.getElementById('switchToSignUp').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeSignInModal();
      this.openSignUpModal();
    });
    document.getElementById('switchToSignIn').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeSignUpModal();
      this.openSignInModal();
    });

    // Close modals on outside click
    [this.signInModal, this.signUpModal, this.profileModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
          // Remove blur effect for auth modals
          if (modal === this.signInModal || modal === this.signUpModal) {
            this.removeBackgroundBlur();
            // Clear pending action if auth modal is closed without authentication
            if (this.pendingAction) {
              console.log('Auth modal closed by outside click - clearing pending action');
              this.pendingAction = null;
            }
          }
        }
      });
    });

    // Password toggle events
    this.signInPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('signIn'));
    this.signUpPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('signUp'));

    // Sidebar toggle
    this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

    // Window focus event for authentication check
    window.addEventListener('focus', () => {
      console.log('Window focus event fired');
      this.handleWindowFocus();
    });
    
    // Page visibility API for better tab focus detection
    document.addEventListener('visibilitychange', () => {
      console.log('Visibility change event fired, document hidden:', document.hidden);
      if (!document.hidden) {
        console.log('Tab became visible, triggering auth check');
        this.handleWindowFocus();
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

  async loadDueDates() {
    try {
      const { overdue, upcoming } = await apiService.getDueDateNotes();
      this.renderDueDates(overdue, upcoming);
    } catch (error) {
      console.error('Error loading due dates:', error);
      this.overdueCount.textContent = '0';
      this.upcomingCount.textContent = '0';
      this.overdueList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No overdue notes</div>';
      this.upcomingList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No upcoming notes</div>';
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
    
    // Separate items into pending and completed
    const items = note.items || [];
    const completedIndexes = new Set(note.completedItems || []);
    const pendingItems = items.filter((item, index) => !completedIndexes.has(index));
    const completedItems = items.filter((item, index) => completedIndexes.has(index));
    
    // Handle due date
    const dueDateInfo = this.getDueDateInfo(note.dueDate);
    
    return `
      <div class="note-card" style="background-color: ${note.backgroundColor || '#ffffff'}">
        <div class="note-title">${this.escapeHtml(note.title)}</div>
        
        ${dueDateInfo ? `
          <div class="note-due-date ${dueDateInfo.class}">
            <i class="fas fa-${dueDateInfo.icon}"></i>
            <span>${dueDateInfo.text}</span>
          </div>
        ` : ''}
        
        ${pendingItems.length > 0 ? `
          <div class="note-section">
            <div class="note-section-title">Pending</div>
            <ul class="note-items">
              ${pendingItems.map(item => `<li class="note-item">${this.escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${completedItems.length > 0 ? `
          <div class="note-section">
            <div class="note-section-title">Completed</div>
            <ul class="note-items">
              ${completedItems.map(item => `<li class="note-item completed">${this.escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${items.length === 0 ? `
          <div class="note-content" style="color: #9aa0a6; font-style: italic;">No items yet</div>
        ` : ''}
        
        <div class="note-meta-section">
          ${note.tags && note.tags.length > 0 ? `
            <div class="note-tags">
              ${note.tags.map(tag => `<span class="note-tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : '<div></div>'}
        </div>
        
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
    // Check if user is authenticated first
    if (!apiService.isAuthenticated()) {
      console.log('User not authenticated - setting pending action and showing sign-in modal');
      this.pendingAction = { type: 'create' };
      this.openSignInModal();
      return;
    }

    // User is authenticated - proceed with create note modal
    console.log('User authenticated - opening create note modal');
    this.editingNote = null;
    this.modalTitle.textContent = 'Create Note';
    this.noteForm.reset();
    this.todoItems = [];
    this.completedItems = new Set();
    this.renderTodoItems();
    this.dueDateStatus.style.display = 'none';
    this.selectColor(this.colorPicker.querySelector('[data-color="#ffffff"]'));
    this.noteModal.style.display = 'block';
  }

  openEditModal(note) {
    // Check if user is authenticated first
    if (!apiService.isAuthenticated()) {
      console.log('User not authenticated - setting pending action and showing sign-in modal');
      this.pendingAction = { type: 'edit', note: note };
      this.openSignInModal();
      return;
    }

    // User is authenticated - proceed with edit note modal
    console.log('User authenticated - opening edit note modal');
    this.editingNote = note;
    this.modalTitle.textContent = 'Edit Note';
    this.noteTitle.value = note.title;
    this.todoItems = [...(note.items || [])];
    this.completedItems = new Set(note.completedItems || []);
    this.renderTodoItems();
    this.noteTags.value = note.tags ? note.tags.join(', ') : '';
    this.noteDueDate.value = note.dueDate ? this.formatDateForInput(note.dueDate) : '';
    this.updateDueDateStatus();
    this.selectColor(this.colorPicker.querySelector(`[data-color="${note.backgroundColor || '#ffffff'}"]`));
    this.noteModal.style.display = 'block';
  }

  async closeModalWithSave() {
    // Clear any pending autosave timeout
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }

    // Check if there are any changes to save
    const hasChanges = this.noteTitle.value.trim() || 
                      this.todoItems.length > 0 || 
                      this.noteTags.value.trim() ||
                      this.noteDueDate.value;

    // If there are changes, trigger autosave and wait for it to complete
    if (hasChanges && !this.isAutoSaving) {
      console.log('Triggering final autosave before closing modal');
      await this.performAutosave();
    }

    // Now close the modal
    this.closeModal();
  }

  closeModal() {
    this.noteModal.style.display = 'none';
    this.editingNote = null;
    this.todoItems = [];
    this.completedItems = new Set();
    this.dueDateStatus.style.display = 'none';
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

  scheduleAutosave() {
    if (!this.editingNote && !this.noteTitle.value.trim()) {
      // Don't autosave new notes until there's at least a title
      return;
    }

    // Clear existing timeout
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }

    // Show saving status
    this.showAutosaveStatus('saving');

    // Schedule autosave after 1 second of inactivity
    this.autosaveTimeout = setTimeout(() => {
      this.performAutosave();
    }, 1000);
  }

  async performAutosave() {
    if (this.isAutoSaving) return;

    const noteData = {
      title: this.noteTitle.value.trim(),
      items: this.todoItems,
      completedItems: Array.from(this.completedItems),
      tags: this.noteTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
      backgroundColor: this.selectedColor,
      dueDate: this.noteDueDate.value ? new Date(this.noteDueDate.value + 'T23:59:59').toISOString() : null
    };

    // Validate required fields
    if (!noteData.title) {
      this.showAutosaveStatus('error', 'Title is required');
      return;
    }

    // Validate tags limit
    if (noteData.tags.length > 9) {
      this.showAutosaveStatus('error', 'Maximum 9 tags allowed');
      return;
    }

    this.isAutoSaving = true;

    try {
      if (this.editingNote) {
        const updatedNote = await apiService.updateNote(this.editingNote._id, noteData);
        this.editingNote = updatedNote;
      } else {
        const createdNote = await apiService.createNote(noteData);
        this.editingNote = createdNote;
        this.modalTitle.textContent = 'Edit Note';
      }
      
      this.showAutosaveStatus('saved');
      this.loadNotes();
      this.loadTags();
      this.loadDueDates();
    } catch (error) {
      console.error('Error saving note:', error);
      this.showAutosaveStatus('error', 'Failed to save');
    } finally {
      this.isAutoSaving = false;
    }
  }

  showAutosaveStatus(status, message = null) {
    const statusElement = this.autosaveStatus;
    const icon = statusElement.querySelector('i');
    const text = statusElement.querySelector('span');

    // Remove all status classes
    statusElement.classList.remove('saving', 'visible');
    
    switch (status) {
      case 'saving':
        statusElement.classList.add('visible', 'saving');
        icon.className = 'fas fa-spinner';
        text.textContent = 'Saving...';
        break;
      case 'saved':
        statusElement.classList.add('visible');
        icon.className = 'fas fa-check-circle';
        text.textContent = 'Auto-saved';
        // Hide after 3 seconds
        setTimeout(() => {
          statusElement.classList.remove('visible');
        }, 3000);
        break;
      case 'error':
        statusElement.classList.add('visible');
        icon.className = 'fas fa-exclamation-triangle';
        icon.style.color = '#ea4335';
        text.textContent = message || 'Error saving';
        text.style.color = '#ea4335';
        // Hide after 5 seconds
        setTimeout(() => {
          statusElement.classList.remove('visible');
          icon.style.color = '';
          text.style.color = '';
        }, 5000);
        break;
    }
  }

  async toggleArchive(note) {
    try {
      await apiService.updateNote(note._id, { isArchived: !note.isArchived });
      this.loadNotes();
      this.loadDueDates(); // Refresh reminder counts
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
          this.loadDueDates(); // Refresh reminder counts
        } catch (error) {
          console.error('Error permanently deleting note:', error);
        }
      }
    } else {
      if (confirm('Are you sure you want to delete this note?')) {
        try {
          await apiService.deleteNote(note._id);
          this.loadNotes();
          this.loadDueDates(); // Refresh reminder counts
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
      this.loadDueDates(); // Refresh reminder counts
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

  addTodoItem() {
    const itemText = this.newTodoItem.value.trim();
    if (!itemText) return;

    this.todoItems.push(itemText);
    this.newTodoItem.value = '';
    this.renderTodoItems();
    this.scheduleAutosave();
  }

  removeTodoItem(index) {
    // Adjust completed items indexes when removing an item
    const newCompletedItems = new Set();
    this.completedItems.forEach(completedIndex => {
      if (completedIndex < index) {
        newCompletedItems.add(completedIndex);
      } else if (completedIndex > index) {
        newCompletedItems.add(completedIndex - 1);
      }
      // Skip the removed item (completedIndex === index)
    });
    
    this.completedItems = newCompletedItems;
    this.todoItems.splice(index, 1);
    this.renderTodoItems();
    this.scheduleAutosave();
  }

  toggleTodoItem(index) {
    if (this.completedItems.has(index)) {
      this.completedItems.delete(index);
    } else {
      this.completedItems.add(index);
    }
    this.renderTodoItems();
    this.scheduleAutosave();
  }

  renderTodoItems() {
    if (this.todoItems.length === 0) {
      this.todoItemsList.innerHTML = '<div style="color: #9aa0a6; font-size: 14px; padding: 8px 0;">No items added yet</div>';
      return;
    }

    this.todoItemsList.innerHTML = this.todoItems.map((item, index) => {
      const isCompleted = this.completedItems.has(index);
      return `
        <div class="todo-item">
          <input type="checkbox" class="todo-checkbox" ${isCompleted ? 'checked' : ''} 
                 onchange="window.noteApp.toggleTodoItem(${index})">
          <span class="todo-text ${isCompleted ? 'completed' : ''}">${this.escapeHtml(item)}</span>
          <button type="button" class="todo-remove-btn" onclick="window.noteApp.removeTodoItem(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  getDueDateInfo(dueDate) {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const now = new Date();
    
    // Reset time to start of day for accurate comparison
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = dueDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        class: 'due-today',
        icon: 'calendar-day',
        text: 'Due today'
      };
    } else if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        class: 'overdue',
        icon: 'exclamation-triangle',
        text: `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`
      };
    } else if (diffDays <= 7) {
      return {
        class: 'upcoming',
        icon: 'clock',
        text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`
      };
    } else {
      return {
        class: 'neutral',
        icon: 'calendar',
        text: `Due ${due.toLocaleDateString()}`
      };
    }
  }

  formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 10);
  }

  renderDueDates(overdue, upcoming) {
    this.overdueCount.textContent = overdue.length;
    this.upcomingCount.textContent = upcoming.length;

    if (overdue.length === 0) {
      this.overdueList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No overdue notes</div>';
    } else {
      this.overdueList.innerHTML = overdue.map(note => `
        <div class="due-note-item" onclick="window.noteApp.openEditModal(${JSON.stringify(note).replace(/"/g, '&quot;')})">
          <div class="due-note-title">${this.escapeHtml(note.title)}</div>
          <div class="due-note-date">${this.getDueDateInfo(note.dueDate).text}</div>
        </div>
      `).join('');
    }

    if (upcoming.length === 0) {
      this.upcomingList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No upcoming notes</div>';
    } else {
      this.upcomingList.innerHTML = upcoming.map(note => `
        <div class="due-note-item" onclick="window.noteApp.openEditModal(${JSON.stringify(note).replace(/"/g, '&quot;')})">
          <div class="due-note-title">${this.escapeHtml(note.title)}</div>
          <div class="due-note-date">${this.getDueDateInfo(note.dueDate).text}</div>
        </div>
      `).join('');
    }
  }

  updateDueDateStatus() {
    if (!this.noteDueDate.value) {
      this.dueDateStatus.style.display = 'none';
      return;
    }

    const dateString = this.noteDueDate.value + 'T23:59:59';
    const dueDateInfo = this.getDueDateInfo(dateString);
    
    if (dueDateInfo) {
      this.dueDateStatus.style.display = 'flex';
      this.dueDateStatus.className = `due-date-status ${dueDateInfo.class}`;
      this.dueDateStatus.innerHTML = `
        <i class="fas fa-${dueDateInfo.icon}"></i>
        <span>${dueDateInfo.text}</span>
      `;
    } else {
      this.dueDateStatus.style.display = 'none';
    }
  }

  // Authentication methods
  async checkAuthentication() {
    if (apiService.isAuthenticated()) {
      try {
        this.currentUser = await apiService.getProfile();
        this.updateUserInterface();
        this.loadNotes();
        this.loadTags();
        this.loadDueDates();
      } catch (error) {
        console.error('Failed to get user profile:', error);
        this.handleLogout();
      }
    } else {
      this.showSignInState();
    }
  }

  updateUserInterface() {
    this.userEmail.textContent = this.currentUser.email;
    this.userInfo.style.display = 'flex';
    this.signInBtn.style.display = 'none';
  }

  showSignInState() {
    this.userInfo.style.display = 'none';
    this.signInBtn.style.display = 'block';
    this.showEmptyState('Please sign in to view your notes');
  }

  openSignInModal() {
    this.signInError.style.display = 'none';
    this.signInForm.reset();
    this.signInModal.style.display = 'block';
    this.applyBackgroundBlur();
  }

  openSignUpModal() {
    this.signUpError.style.display = 'none';
    this.signUpForm.reset();
    this.signUpModal.style.display = 'block';
    this.applyBackgroundBlur();
  }

  openProfileModal() {
    if (!this.currentUser) return;
    
    this.profileEmail.textContent = this.currentUser.email;
    this.profileJoined.textContent = new Date().toLocaleDateString(); // Placeholder
    this.profileModal.style.display = 'block';
  }

  closeSignInModal() {
    this.signInModal.style.display = 'none';
    this.removeBackgroundBlur();
    // Clear pending action if modal is closed without authentication
    if (this.pendingAction) {
      console.log('Sign-in modal closed - clearing pending action');
      this.pendingAction = null;
    }
  }

  closeSignUpModal() {
    this.signUpModal.style.display = 'none';
    this.removeBackgroundBlur();
    // Clear pending action if modal is closed without authentication
    if (this.pendingAction) {
      console.log('Sign-up modal closed - clearing pending action');
      this.pendingAction = null;
    }
  }

  closeProfileModal() {
    this.profileModal.style.display = 'none';
  }

  async handleSignIn(e) {
    e.preventDefault();
    
    const email = this.signInEmail.value.trim();
    const password = this.signInPassword.value;

    try {
      const response = await apiService.login(email, password);
      if (response && response.access_token && response.user) {
        this.currentUser = response.user;
        this.updateUserInterface();
        this.closeSignInModal();
        this.loadNotes();
        this.loadTags();
        this.loadDueDates();
        
        // Execute pending action if any
        this.executePendingAction();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.showAuthError('signIn', error.message || 'Login failed');
    }
  }

  async handleSignUp(e) {
    e.preventDefault();
    
    const email = this.signUpEmail.value.trim();
    const password = this.signUpPassword.value;

    // Let backend handle all validation to show consistent messages
    try {
      const response = await apiService.register(email, password);
      if (response && response.access_token && response.user) {
        this.currentUser = response.user;
        this.updateUserInterface();
        this.closeSignUpModal();
        this.loadNotes();
        this.loadTags();
        this.loadDueDates();
        
        // Execute pending action if any
        this.executePendingAction();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      this.showAuthError('signUp', error.message || 'Registration failed');
    }
  }

  handleLogout() {
    console.log('Logging out - clearing all user data');
    apiService.logout();
    this.currentUser = null;
    this.notes = [];
    
    // Clear all user-specific data
    this.clearAllUserData();
    
    this.showSignInState();
    this.closeProfileModal();
  }

  // Clear all user-specific data from UI
  clearAllUserData() {
    console.log('Clearing all user data from UI');
    
    // Clear notes grid
    this.notesGrid.innerHTML = '';
    
    // Clear tags list
    this.tagsList.innerHTML = '<div style="padding: 0 20px; color: #9aa0a6; font-size: 12px;">No tags yet</div>';
    
    // Clear reminders (overdue and upcoming)
    this.overdueCount.textContent = '0';
    this.upcomingCount.textContent = '0';
    this.overdueList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No overdue notes</div>';
    this.upcomingList.innerHTML = '<div style="padding: 8px; color: #9aa0a6; font-size: 11px;">No upcoming notes</div>';
    
    // Reset search
    this.searchInput.value = '';
    
    // Reset current view to default
    this.currentView = 'all';
    this.updateActiveView('all');
    
    // Clear any pending actions
    this.pendingAction = null;
    
    console.log('✅ All user data cleared');
  }

  showAuthError(type, message) {
    const errorElement = type === 'signIn' ? this.signInError : this.signUpError;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  togglePasswordVisibility(type) {
    const passwordInput = type === 'signIn' ? this.signInPassword : this.signUpPassword;
    const toggleButton = type === 'signIn' ? this.signInPasswordToggle : this.signUpPasswordToggle;
    const icon = toggleButton.querySelector('i');

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      passwordInput.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }

  // Window focus handler for authentication check and data sync
  async handleWindowFocus() {
    console.log('🔄 Tab focus detected...');
    
    // Rate limiting to prevent excessive API calls
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncCooldown) {
      console.log('⏳ Sync cooldown active, skipping refresh');
      return;
    }
    
    console.log('Is authenticated:', apiService.isAuthenticated());
    
    if (apiService.isAuthenticated()) {
      // Check if token is expiring soon
      if (apiService.isTokenExpiringSoon()) {
        const expiry = apiService.getTokenExpiry();
        console.warn('⚠️ Token expires soon:', expiry ? expiry.toLocaleString() : 'Unknown');
        // You could show a notification here asking user to refresh their session
      }
      
      try {
        console.log('Verifying authentication and syncing data...');
        const profile = await apiService.getProfile();
        console.log('✅ Authentication verified');
        
        // Update user info if needed
        if (!this.currentUser && profile) {
          this.currentUser = profile;
          this.updateUserInterface();
        }
        
        // Sync data between tabs
        await this.syncAllData();
        
      } catch (error) {
        console.log('❌ Authentication expired, showing sign-in modal');
        console.error('Profile API error:', error);
        // API returned unauthenticated, clear data and show sign-in modal
        // Note: The API service automatically handles logout on 401
        this.currentUser = null;
        this.clearAllUserData();
        this.showSignInState();
        
        if (!this.signInModal || this.signInModal.style.display === 'none') {
          this.openSignInModal();
        }
      }
    } else {
      console.log('👤 User not authenticated, skipping data sync');
    }
  }

  // Sync all data between tabs
  async syncAllData() {
    console.log('🔄 Syncing all data...');
    this.lastSyncTime = Date.now();
    
    try {
      await Promise.all([
        this.loadNotes(),
        this.loadTags(), 
        this.loadDueDates()
      ]);
      console.log('✅ All data synced successfully');
    } catch (error) {
      console.error('❌ Error syncing data:', error);
    }
  }

  // Test method to manually trigger auth check (for debugging)
  testAuthCheck() {
    console.log('Manual auth check triggered');
    this.handleWindowFocus();
  }

  // Manual sync trigger (for debugging)
  async manualSync() {
    console.log('Manual sync triggered');
    if (apiService.isAuthenticated()) {
      await this.syncAllData();
    } else {
      console.log('Not authenticated - cannot sync');
    }
  }

  // Get token information for debugging
  getTokenInfo() {
    const isAuth = apiService.isAuthenticated();
    const expiry = apiService.getTokenExpiry();
    const expiringSoon = apiService.isTokenExpiringSoon();
    
    console.log('=== TOKEN INFO ===');
    console.log('Is Authenticated:', isAuth);
    console.log('Token Expiry:', expiry ? expiry.toLocaleString() : 'No expiry found');
    console.log('Expires Soon (< 1 hour):', expiringSoon);
    console.log('Current Time:', new Date().toLocaleString());
    
    if (expiry) {
      const timeLeft = expiry.getTime() - new Date().getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      console.log(`Time until expiry: ${hoursLeft}h ${minutesLeft}m`);
    }
    
    return { isAuth, expiry, expiringSoon };
  }

  // Background blur effects
  applyBackgroundBlur() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.classList.add('blur-background');
    }
  }

  removeBackgroundBlur() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.classList.remove('blur-background');
    }
  }

  // Sidebar functionality
  initializeSidebar() {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
      this.sidebar.classList.add('collapsed');
      this.updateSidebarToggleIcon(true);
    }
  }

  toggleSidebar() {
    const isCollapsed = this.sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
      this.sidebar.classList.remove('collapsed');
      localStorage.setItem('sidebar-collapsed', 'false');
      this.updateSidebarToggleIcon(false);
    } else {
      this.sidebar.classList.add('collapsed');
      localStorage.setItem('sidebar-collapsed', 'true');
      this.updateSidebarToggleIcon(true);
    }
  }

  updateSidebarToggleIcon(isCollapsed) {
    const icon = this.sidebarToggle.querySelector('i');
    if (isCollapsed) {
      icon.className = 'fas fa-chevron-right';
    } else {
      icon.className = 'fas fa-bars';
    }
  }

  // Execute pending action after successful authentication
  executePendingAction() {
    if (!this.pendingAction) {
      return;
    }

    console.log('Executing pending action:', this.pendingAction);
    
    const action = this.pendingAction;
    this.pendingAction = null; // Clear pending action
    
    // Small delay to allow modals to close properly
    setTimeout(() => {
      switch (action.type) {
        case 'create':
          this.openCreateModal();
          break;
        case 'edit':
          if (action.note) {
            this.openEditModal(action.note);
          }
          break;
        default:
          console.log('Unknown pending action type:', action.type);
      }
    }, 100);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.noteApp = new NoteApp();
  
  // Expose test methods globally for debugging
  window.testAuthCheck = () => {
    if (window.noteApp) {
      window.noteApp.testAuthCheck();
    } else {
      console.log('NoteApp not initialized yet');
    }
  };
  
  window.getTokenInfo = () => {
    if (window.noteApp) {
      return window.noteApp.getTokenInfo();
    } else {
      console.log('NoteApp not initialized yet');
      return null;
    }
  };
  
  window.clearToken = () => {
    if (window.apiService || apiService) {
      (window.apiService || apiService).clearToken();
      console.log('Token cleared manually');
      if (window.noteApp) {
        window.noteApp.handleLogout();
      }
    } else {
      console.log('ApiService not available');    
    }
  };
  
  window.syncData = async () => {
    if (window.noteApp) {
      await window.noteApp.manualSync();
    } else {
      console.log('NoteApp not initialized yet');
    }
  };
}); 