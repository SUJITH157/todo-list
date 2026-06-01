/* ===== FlowUp Todo App — Core Logic ===== */

document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM References ----
  const taskInput = document.getElementById('taskInput');
  const addBtn = document.getElementById('addBtn');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const clearCompletedBtn = document.getElementById('clearCompleted');
  const categorySelect = document.getElementById('categorySelect');
  const dateInput = document.getElementById('dateInput');
  const progressFill = document.getElementById('progressFill');

  // ---- Auth DOM References ----
  const authScreen = document.getElementById('authScreen');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginUsernameInput = document.getElementById('loginUsername');
  const loginPasswordInput = document.getElementById('loginPassword');
  const registerUsernameInput = document.getElementById('registerUsername');
  const registerPasswordInput = document.getElementById('registerPassword');
  const registerConfirmPasswordInput = document.getElementById('registerConfirmPassword');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  
  const sidebarProfile = document.getElementById('sidebarProfile');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const logoutBtn = document.getElementById('logoutBtn');

  // ---- Database & State ----
  let users = JSON.parse(localStorage.getItem('flowup-users')) || [];
  let currentUser = localStorage.getItem('flowup-current-user') || null;
  let todos = [];
  let dsaTotalSolved = 0;

  let currentFilter = 'all';       // all | active | completed
  let currentCategory = null;      // null | personal | work | health | learning | daily
  let currentSort = 'newest';      // newest | priority | dueDate
  let searchQuery = '';
  let selectedPriority = 'medium';

  // ---- Authentication Core Logic ----
  function loadUserData(username) {
    currentUser = username;
    localStorage.setItem('flowup-current-user', username);
    
    // Load specific user's todos and DSA solved count
    todos = JSON.parse(localStorage.getItem(`flowup-todos-${username}`)) || [];
    dsaTotalSolved = parseInt(localStorage.getItem(`flowup-dsa-solved-${username}`)) || 0;
    
    // Update profile display
    profileNameDisplay.textContent = username;
    profileAvatar.textContent = username.charAt(0).toUpperCase();
    
    // Update DSA solved counter widget
    dsaCount.textContent = dsaTotalSolved;
    
    // Show main app / hide auth
    authScreen.classList.add('hidden');
    
    // Perform initial render
    refreshDailyTasks();
    render();
  }

  function showAuthScreen() {
    currentUser = null;
    localStorage.removeItem('flowup-current-user');
    authScreen.classList.remove('hidden');
    
    // Reset inputs & errors
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
    registerUsernameInput.value = '';
    registerPasswordInput.value = '';
    registerConfirmPasswordInput.value = '';
    loginError.style.display = 'none';
    registerError.style.display = 'none';
  }

  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  }

  // Auth Tabs Event Listeners
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    loginError.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
    registerError.style.display = 'none';
  });

  // Sign In Handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;
    
    if (!username || !password) {
      showError(loginError, 'All fields are required.');
      return;
    }
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      showError(loginError, 'Invalid username or password.');
      return;
    }
    
    const passwordHash = btoa(password); // Obfuscate password
    if (user.password !== passwordHash) {
      showError(loginError, 'Invalid username or password.');
      return;
    }
    
    loadUserData(user.username);
  });

  // Sign Up Handler
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    registerError.style.display = 'none';
    
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmPasswordInput.value;
    
    if (!username || !password || !confirmPassword) {
      showError(registerError, 'All fields are required.');
      return;
    }
    
    if (password.length < 6) {
      showError(registerError, 'Password must be at least 6 characters.');
      return;
    }
    
    if (password !== confirmPassword) {
      showError(registerError, 'Passwords do not match.');
      return;
    }
    
    // Check username conflict
    const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
      showError(registerError, 'Username is already taken.');
      return;
    }
    
    const passwordHash = btoa(password);
    const newUser = {
      username,
      password: passwordHash,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('flowup-users', JSON.stringify(users));
    
    // Migrate Guest tasks if any exist
    const guestTodos = JSON.parse(localStorage.getItem('flowup-todos')) || [];
    if (guestTodos.length > 0) {
      localStorage.setItem(`flowup-todos-${username}`, JSON.stringify(guestTodos));
      
      const guestDsa = localStorage.getItem('flowup-dsa-solved') || '0';
      localStorage.setItem(`flowup-dsa-solved-${username}`, guestDsa);
      
      localStorage.removeItem('flowup-todos');
      localStorage.removeItem('flowup-dsa-solved');
    }
    
    loadUserData(username);
  });

  // Sign Out Handler
  logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
      showAuthScreen();
    }
  });

  // ---- Priority Buttons ----
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPriority = btn.dataset.priority;
    });
  });

  // ---- Add Task ----
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) { taskInput.focus(); return; }

    const task = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority: selectedPriority,
      category: categorySelect.value,
      dueDate: dateInput.value || null,
      createdAt: new Date().toISOString()
    };

    todos.unshift(task);
    save();
    render();

    // Reset form
    taskInput.value = '';
    dateInput.value = '';
    taskInput.focus();
  }

  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  // ---- Toggle Complete ----
  function toggleTask(id) {
    const task = todos.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAtDate = new Date().toDateString();
      } else {
        delete task.completedAtDate;
      }
      save();
      render();
    }
  }

  // ---- Delete Task ----
  function deleteTask(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.classList.add('removing');
      setTimeout(() => {
        todos = todos.filter(t => t.id !== id);
        save(); render();
      }, 280);
    }
  }

  // ---- Edit Task (inline) ----
  function editTask(id) {
    const task = todos.find(t => t.id === id);
    if (!task) return;
    const card = document.querySelector(`[data-id="${id}"]`);
    const titleEl = card.querySelector('.task-title');
    const original = task.text;

    titleEl.contentEditable = true;
    titleEl.focus();
    titleEl.style.outline = '2px solid var(--accent)';
    titleEl.style.borderRadius = '4px';
    titleEl.style.padding = '2px 4px';

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function finish() {
      titleEl.contentEditable = false;
      titleEl.style.outline = '';
      titleEl.style.padding = '';
      const newText = titleEl.textContent.trim();
      if (newText && newText !== original) {
        task.text = newText;
        save();
      }
      render();
    }

    titleEl.addEventListener('blur', finish, { once: true });
    titleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
      if (e.key === 'Escape') { titleEl.textContent = original; titleEl.blur(); }
    });
  }

  // ---- Clear Completed ----
  clearCompletedBtn.addEventListener('click', () => {
    todos = todos.filter(t => !t.completed);
    save(); render();
  });

  // ---- Filters ----
  document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      currentCategory = null;
      setActiveNav(btn);
      render();
    });
  });

  // ---- Categories ----
  document.querySelectorAll('.nav-item[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      currentFilter = 'all';
      setActiveNav(btn);
      render();
    });
  });

  function setActiveNav(activeBtn) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    // Close mobile sidebar
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  }

  // ---- Sort ----
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      render();
    });
  });

  // ---- Search ----
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  // ---- Mobile Sidebar ----
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
  });
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  // ---- Save to localStorage ----
  function save() {
    if (currentUser) {
      localStorage.setItem(`flowup-todos-${currentUser}`, JSON.stringify(todos));
    }
  }

  // ---- Get Filtered & Sorted List ----
  function getFilteredTodos() {
    let filtered = [...todos];

    // Filter
    if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);

    // Category
    if (currentCategory) filtered = filtered.filter(t => t.category === currentCategory);

    // Search
    if (searchQuery) filtered = filtered.filter(t => t.text.toLowerCase().includes(searchQuery));

    // Sort
    if (currentSort === 'priority') {
      const prio = { high: 0, medium: 1, low: 2 };
      filtered.sort((a, b) => prio[a.priority] - prio[b.priority]);
    } else if (currentSort === 'dueDate') {
      filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    }
    // 'newest' is default order (already sorted by creation, newest first)

    return filtered;
  }

  // ---- Format Date ----
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = d - today;
    const dayMs = 86400000;

    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff <= dayMs) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  // ---- Render ----
  function render() {
    const filtered = getFilteredTodos();

    // Stats
    const total = todos.length;
    const done = todos.filter(t => t.completed).length;
    const pending = total - done;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statProgress').textContent = progress + '%';
    progressFill.style.width = progress + '%';

    // Sidebar counts
    document.getElementById('countAll').textContent = total;
    document.getElementById('countActive').textContent = pending;
    document.getElementById('countCompleted').textContent = done;
    document.getElementById('countPersonal').textContent = todos.filter(t => t.category === 'personal').length;
    document.getElementById('countWork').textContent = todos.filter(t => t.category === 'work').length;
    document.getElementById('countHealth').textContent = todos.filter(t => t.category === 'health').length;
    document.getElementById('countLearning').textContent = todos.filter(t => t.category === 'learning').length;
    document.getElementById('countDaily').textContent = todos.filter(t => t.category === 'daily').length;

    // Empty state
    if (filtered.length === 0) {
      taskList.innerHTML = '';
      emptyState.style.display = 'block';
      if (searchQuery) {
        emptyState.querySelector('.empty-title').textContent = 'No matching tasks';
        emptyState.querySelector('.empty-desc').textContent = 'Try a different search term.';
      } else if (currentFilter === 'completed' && done === 0) {
        emptyState.querySelector('.empty-title').textContent = 'No completed tasks';
        emptyState.querySelector('.empty-desc').textContent = 'Finish some tasks to see them here!';
      } else {
        emptyState.querySelector('.empty-title').textContent = 'No tasks yet';
        emptyState.querySelector('.empty-desc').textContent = 'Add your first task above to get started!';
      }
      return;
    }

    emptyState.style.display = 'none';

    taskList.innerHTML = filtered.map(task => {
      const dueDateStr = formatDate(task.dueDate);
      const overdue = !task.completed && isOverdue(task.dueDate);

      return `
        <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="window._toggle('${task.id}')" aria-label="Toggle complete">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="${task.completed ? '#1A1A1A' : '#D1D5DB'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="task-content">
            <div class="task-title">${escapeHtml(task.text)}</div>
            <div class="task-meta">
              <span class="task-tag tag-priority-${task.priority}">${capitalize(task.priority)}</span>
              <span class="task-tag tag-category" data-cat="${task.category}">${capitalize(task.category)}</span>
              ${dueDateStr ? `<span class="tag-date ${overdue ? 'overdue' : ''}">${dueDateStr}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="action-btn edit-btn" onclick="window._edit('${task.id}')" aria-label="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn delete-btn" onclick="window._delete('${task.id}')" aria-label="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---- Helpers ----
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ---- Expose handlers to inline onclick ----
  window._toggle = toggleTask;
  window._delete = deleteTask;
  window._edit = editTask;

  // ---- DSA Tracker Logic ----
  const dsaCount = document.getElementById('dsaCount');
  const dsaNewInput = document.getElementById('dsaNewInput');
  const dsaAddBtn = document.getElementById('dsaAddBtn');
  const dsaResetBtn = document.getElementById('dsaResetBtn');

  dsaCount.textContent = dsaTotalSolved;

  dsaAddBtn.addEventListener('click', () => {
    const val = parseInt(dsaNewInput.value) || 0;
    if (val > 0) {
      dsaTotalSolved += val;
      if (currentUser) {
        localStorage.setItem(`flowup-dsa-solved-${currentUser}`, dsaTotalSolved);
      }
      
      // Animate counting up for extra polish
      animateCount(dsaCount, dsaTotalSolved - val, dsaTotalSolved, 300);
      dsaNewInput.value = 1;
    }
  });

  dsaResetBtn.addEventListener('click', () => {
    if (dsaTotalSolved === 0) return;
    if (confirm('Reset your total DSA questions count to 0?')) {
      const prev = dsaTotalSolved;
      dsaTotalSolved = 0;
      if (currentUser) {
        localStorage.setItem(`flowup-dsa-solved-${currentUser}`, dsaTotalSolved);
      }
      animateCount(dsaCount, prev, 0, 300);
    }
  });

  dsaNewInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      dsaAddBtn.click();
    }
  });

  // Helper count-up animator
  function animateCount(element, start, end, duration) {
    const range = end - start;
    let current = start;
    const increment = range > 0 ? 1 : -1;
    const stepTime = Math.max(Math.floor(duration / Math.abs(range)), 15);
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      if (current === end) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  // ---- Refresh Daily Tasks ----
  function refreshDailyTasks() {
    const today = new Date().toDateString();
    let updated = false;
    todos.forEach(task => {
      if (task.category === 'daily' && task.completed) {
        if (!task.completedAtDate || task.completedAtDate !== today) {
          task.completed = false;
          delete task.completedAtDate;
          updated = true;
        }
      }
    });
    if (updated) {
      save();
    }
  }

  // Refresh daily tasks on page focus or tab visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshDailyTasks();
      render();
    }
  });

  window.addEventListener('focus', () => {
    refreshDailyTasks();
    render();
  });

  // ---- Initial Render ----
  if (currentUser) {
    loadUserData(currentUser);
  } else {
    showAuthScreen();
  }
});
