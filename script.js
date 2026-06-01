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

  // ---- State ----
  let todos = JSON.parse(localStorage.getItem('flowup-todos')) || [];
  let currentFilter = 'all';       // all | active | completed
  let currentCategory = null;      // null | personal | work | health | learning
  let currentSort = 'newest';      // newest | priority | dueDate
  let searchQuery = '';
  let selectedPriority = 'medium';

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
    if (task) { task.completed = !task.completed; save(); render(); }
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
    localStorage.setItem('flowup-todos', JSON.stringify(todos));
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

  let dsaTotalSolved = parseInt(localStorage.getItem('flowup-dsa-solved')) || 0;
  dsaCount.textContent = dsaTotalSolved;

  dsaAddBtn.addEventListener('click', () => {
    const val = parseInt(dsaNewInput.value) || 0;
    if (val > 0) {
      dsaTotalSolved += val;
      localStorage.setItem('flowup-dsa-solved', dsaTotalSolved);
      
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
      localStorage.setItem('flowup-dsa-solved', dsaTotalSolved);
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

  // ---- Initial Render ----
  render();
});
