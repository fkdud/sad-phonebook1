/**
 * Aether Contacts - Core JavaScript Logic
 * Handles state management, UI rendering, event handling,
 * localStorage sync, auto-formatting, validation, and Toast alerts.
 */

// ==========================================================================
// Application State
// ==========================================================================
let contacts = [];
let pendingDeleteId = null;
const LOCAL_STORAGE_KEY = 'contacts_data';

// Preloaded template contacts to wow the user on first launch
const DEFAULT_CONTACTS = [
    {
        id: 'default-1',
        name: '홍길동',
        phone: '010-1234-5678',
        email: 'gildong@aether.com',
        notes: '동해 번쩍 서해 번쩍! 미팅 일정 조율 필요.',
        createdAt: new Date().toISOString()
    },
    {
        id: 'default-2',
        name: '이지은',
        phone: '010-9876-5432',
        email: 'dlwlrma@music.co.kr',
        notes: '보컬 트레이닝 코칭 연락처. 매우 친절하심.',
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'default-3',
        name: '김철수',
        phone: '02-765-4321',
        email: 'chulsoo.kim@domain.net',
        notes: '디자이너 파트너사 담당자.',
        createdAt: new Date(Date.now() - 172800000).toISOString()
    }
];

// ==========================================================================
// DOM Elements
// ==========================================================================
const DOM = {
    contactsGrid: document.getElementById('contactsGrid'),
    emptyState: document.getElementById('emptyState'),
    contactCount: document.getElementById('contactCount'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    
    // Action buttons
    btnAddNew: document.getElementById('btnAddNew'),
    btnEmptyAdd: document.getElementById('btnEmptyAdd'),
    
    // Form Modal
    contactModal: document.getElementById('contactModal'),
    contactForm: document.getElementById('contactForm'),
    modalTitle: document.getElementById('modalTitle'),
    contactId: document.getElementById('contactId'),
    contactName: document.getElementById('contactName'),
    contactPhone: document.getElementById('contactPhone'),
    contactEmail: document.getElementById('contactEmail'),
    contactNotes: document.getElementById('contactNotes'),
    notesCharCount: document.getElementById('notesCharCount'),
    btnModalClose: document.getElementById('btnModalClose'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    
    // Errors
    errorName: document.getElementById('errorName'),
    errorPhone: document.getElementById('errorPhone'),
    errorEmail: document.getElementById('errorEmail'),
    
    // Delete Confirm Modal
    confirmModal: document.getElementById('confirmModal'),
    deleteTargetName: document.getElementById('deleteTargetName'),
    btnConfirmCancel: document.getElementById('btnConfirmCancel'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),
    
    // Toasts
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// App Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadContacts();
    setupEventListeners();
    renderContacts();
    lucide.createIcons();
}

// Load contacts from localStorage or initialize defaults
function loadContacts() {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
        try {
            contacts = JSON.parse(rawData);
        } catch (e) {
            console.error('Failed to parse localStorage data, initializing default contacts.', e);
            contacts = [...DEFAULT_CONTACTS];
            saveContacts();
        }
    } else {
        contacts = [...DEFAULT_CONTACTS];
        saveContacts();
    }
}

// Save contacts to localStorage
function saveContacts() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts));
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
    // Add contact buttons
    DOM.btnAddNew.addEventListener('click', () => openModal());
    DOM.btnEmptyAdd.addEventListener('click', () => openModal());
    
    // Search handlers
    DOM.searchInput.addEventListener('input', handleSearch);
    DOM.btnClearSearch.addEventListener('click', clearSearch);
    
    // Modal buttons
    DOM.btnModalClose.addEventListener('click', closeModal);
    DOM.btnModalCancel.addEventListener('click', closeModal);
    DOM.contactForm.addEventListener('submit', handleFormSubmit);
    
    // Form Inputs real-time formatters and validators
    DOM.contactPhone.addEventListener('input', handlePhoneInput);
    DOM.contactNotes.addEventListener('input', handleNotesInput);
    
    DOM.contactName.addEventListener('input', () => validateField('name'));
    DOM.contactPhone.addEventListener('input', () => validateField('phone'));
    DOM.contactEmail.addEventListener('input', () => validateField('email'));
    
    // Confirm Delete Dialog
    DOM.btnConfirmCancel.addEventListener('click', closeConfirmModal);
    DOM.btnConfirmDelete.addEventListener('click', executeDelete);
    
    // Close modals on clicking overlay background
    DOM.contactModal.addEventListener('click', (e) => {
        if (e.target === DOM.contactModal) closeModal();
    });
    DOM.confirmModal.addEventListener('click', (e) => {
        if (e.target === DOM.confirmModal) closeConfirmModal();
    });
}

// ==========================================================================
// Helper Utility Functions
// ==========================================================================

// Prevents Cross-Site Scripting (XSS) attacks
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Generate premium gradients for contact avatars based on the name character
function getAvatarGradient(name) {
    const defaultGradients = [
        'linear-gradient(135deg, hsl(210, 85%, 60%), hsl(240, 85%, 55%))', // Blue to Navy
        'linear-gradient(135deg, hsl(260, 85%, 65%), hsl(290, 80%, 55%))', // Purple to Magenta
        'linear-gradient(135deg, hsl(325, 80%, 60%), hsl(355, 80%, 55%))', // Pink to Red
        'linear-gradient(135deg, hsl(160, 75%, 45%), hsl(200, 75%, 50%))', // Teal to Ocean
        'linear-gradient(135deg, hsl(35, 85%, 55%), hsl(15, 85%, 50%))'    // Orange to Coral
    ];
    
    if (!name) return defaultGradients[0];
    
    // Calculate simple hash of the first character
    const charCode = name.charCodeAt(0) || 0;
    const index = charCode % defaultGradients.length;
    return defaultGradients[index];
}

// Extract initials: e.g. "홍길동" -> "홍", "John Doe" -> "JD"
function getInitials(name) {
    if (!name) return '?';
    
    const trimmed = name.trim();
    // English/spaced names
    if (trimmed.includes(' ')) {
        const parts = trimmed.split(' ');
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    // Korean names or single word names
    return trimmed.substring(0, Math.min(trimmed.length, 2));
}

// Formatting dates neatly: e.g. "2026. 05. 26."
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
}

// Format Korean phone numbers: e.g., 01012345678 -> 010-1234-5678, 027654321 -> 02-765-4321
function formatPhoneNumber(value) {
    const clean = value.replace(/\D/g, '');
    
    // Maximum 11 digits
    const digits = clean.slice(0, 11);
    
    if (digits.startsWith('02')) {
        // Seoul Area Code
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
        // Standard Area Codes or Mobile Codes (010, 031, etc.)
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
}

// ==========================================================================
// Toast Notification Engine
// ==========================================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-circle';
    if (type === 'info') iconName = 'info';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="toast-message">${escapeHTML(message)}</div>
    `;
    
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons(); // Initialize Lucide icon inside toast
    
    // Automatically trigger exit animation and remove toast
    setTimeout(() => {
        toast.classList.add('toast-exit');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 2500);
}

// ==========================================================================
// Phone & Notes Inputs Event Handling
// ==========================================================================
function handlePhoneInput(e) {
    const rawVal = e.target.value;
    const formatted = formatPhoneNumber(rawVal);
    
    // Update input value and retain cursor location if editing middle
    const selectionStart = e.target.selectionStart;
    const prevLen = rawVal.length;
    e.target.value = formatted;
    
    // Simple caret position correction
    if (selectionStart !== null && rawVal.length !== formatted.length) {
        const offset = formatted.length - prevLen;
        e.target.setSelectionRange(selectionStart + offset, selectionStart + offset);
    }
}

function handleNotesInput() {
    const length = DOM.contactNotes.value.length;
    DOM.notesCharCount.textContent = `${length}/150`;
    
    if (length >= 150) {
        DOM.notesCharCount.style.color = 'var(--color-danger)';
    } else {
        DOM.notesCharCount.style.color = 'var(--text-muted)';
    }
}

// ==========================================================================
// Validation Logic
// ==========================================================================
function validateField(fieldName) {
    let isValid = true;
    
    if (fieldName === 'name') {
        const val = DOM.contactName.value.trim();
        if (val.length === 0) {
            DOM.errorName.textContent = '이름을 입력해주세요.';
            DOM.contactName.style.borderColor = 'var(--color-danger)';
            isValid = false;
        } else if (val.length < 2) {
            DOM.errorName.textContent = '이름은 최소 2글자 이상이어야 합니다.';
            DOM.contactName.style.borderColor = 'var(--color-danger)';
            isValid = false;
        } else {
            DOM.errorName.textContent = '';
            DOM.contactName.style.borderColor = '';
        }
    }
    
    if (fieldName === 'phone') {
        const val = DOM.contactPhone.value.trim();
        const digitsOnly = val.replace(/\D/g, '');
        
        if (val.length === 0) {
            DOM.errorPhone.textContent = '전화번호를 입력해주세요.';
            DOM.contactPhone.style.borderColor = 'var(--color-danger)';
            isValid = false;
        } else if (digitsOnly.length < 9) {
            DOM.errorPhone.textContent = '올바른 전화번호 형식이 아닙니다 (최소 9자리).';
            DOM.contactPhone.style.borderColor = 'var(--color-danger)';
            isValid = false;
        } else {
            DOM.errorPhone.textContent = '';
            DOM.contactPhone.style.borderColor = '';
        }
    }
    
    if (fieldName === 'email') {
        const val = DOM.contactEmail.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (val.length > 0 && !emailRegex.test(val)) {
            DOM.errorEmail.textContent = '이메일 형식이 올바르지 않습니다 (예: test@email.com).';
            DOM.contactEmail.style.borderColor = 'var(--color-danger)';
            isValid = false;
        } else {
            DOM.errorEmail.textContent = '';
            DOM.contactEmail.style.borderColor = '';
        }
    }
    
    return isValid;
}

function validateForm() {
    const isNameValid = validateField('name');
    const isPhoneValid = validateField('phone');
    const isEmailValid = validateField('email');
    
    return isNameValid && isPhoneValid && isEmailValid;
}

function clearValidationErrors() {
    DOM.errorName.textContent = '';
    DOM.errorPhone.textContent = '';
    DOM.errorEmail.textContent = '';
    
    DOM.contactName.style.borderColor = '';
    DOM.contactPhone.style.borderColor = '';
    DOM.contactEmail.style.borderColor = '';
}

// ==========================================================================
// Modal Handlers (Open, Close, Submit)
// ==========================================================================
function openModal(contactId = null) {
    clearValidationErrors();
    DOM.contactForm.reset();
    DOM.notesCharCount.textContent = '0/150';
    DOM.notesCharCount.style.color = 'var(--text-muted)';
    
    if (contactId) {
        // Edit Mode
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return;
        
        DOM.modalTitle.textContent = '연락처 수정';
        DOM.contactId.value = contact.id;
        DOM.contactName.value = contact.name;
        DOM.contactPhone.value = contact.phone;
        DOM.contactEmail.value = contact.email || '';
        DOM.contactNotes.value = contact.notes || '';
        
        DOM.notesCharCount.textContent = `${(contact.notes || '').length}/150`;
    } else {
        // Add Mode
        DOM.modalTitle.textContent = '새 연락처 추가';
        DOM.contactId.value = '';
    }
    
    DOM.contactModal.classList.remove('hidden');
    DOM.contactName.focus();
}

function closeModal() {
    DOM.contactModal.classList.add('hidden');
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showToast('입력값을 확인해주세요.', 'warning');
        return;
    }
    
    const id = DOM.contactId.value;
    const name = DOM.contactName.value.trim();
    const phone = DOM.contactPhone.value.trim();
    const email = DOM.contactEmail.value.trim();
    const notes = DOM.contactNotes.value.trim();
    
    if (id) {
        // Update existing contact
        const index = contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            contacts[index] = {
                ...contacts[index],
                name,
                phone,
                email,
                notes
            };
            showToast('연락처가 수정되었습니다.', 'success');
        }
    } else {
        // Add new contact
        const newContact = {
            id: 'contact-' + Date.now(),
            name,
            phone,
            email,
            notes,
            createdAt: new Date().toISOString()
        };
        contacts.push(newContact);
        showToast('새 연락처가 등록되었습니다.', 'success');
    }
    
    saveContacts();
    closeModal();
    renderContacts();
}

// ==========================================================================
// Delete Confirmation Handlers
// ==========================================================================
function openConfirmModal(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    pendingDeleteId = contactId;
    DOM.deleteTargetName.textContent = contact.name;
    DOM.confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    DOM.confirmModal.classList.add('hidden');
    pendingDeleteId = null;
}

function executeDelete() {
    if (!pendingDeleteId) return;
    
    const index = contacts.findIndex(c => c.id === pendingDeleteId);
    if (index !== -1) {
        const deletedName = contacts[index].name;
        contacts.splice(index, 1);
        saveContacts();
        showToast(`'${deletedName}' 연락처가 삭제되었습니다.`, 'info');
    }
    
    closeConfirmModal();
    renderContacts();
}

// ==========================================================================
// Search & Filter Handlers
// ==========================================================================
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length > 0) {
        DOM.btnClearSearch.classList.remove('hidden');
    } else {
        DOM.btnClearSearch.classList.add('hidden');
    }
    
    renderContacts(query);
}

function clearSearch() {
    DOM.searchInput.value = '';
    DOM.btnClearSearch.classList.add('hidden');
    renderContacts();
    DOM.searchInput.focus();
}

// ==========================================================================
// Rendering Engine (Grid Updates)
// ==========================================================================
function renderContacts(query = '') {
    // Sort contacts: alphabetical Korean/English
    const sortedContacts = [...contacts].sort((a, b) => {
        return a.name.localeCompare(b.name, 'ko');
    });
    
    // Filter contacts if search query exists
    const filtered = sortedContacts.filter(c => {
        if (!query) return true;
        const nameMatch = c.name.toLowerCase().includes(query);
        const phoneMatch = c.phone.replace(/-/g, '').includes(query.replace(/-/g, ''));
        const emailMatch = (c.email || '').toLowerCase().includes(query);
        const notesMatch = (c.notes || '').toLowerCase().includes(query);
        
        return nameMatch || phoneMatch || emailMatch || notesMatch;
    });
    
    // Render Stats
    DOM.contactCount.textContent = contacts.length;
    
    // Check for empty conditions
    if (filtered.length === 0) {
        DOM.contactsGrid.innerHTML = '';
        DOM.emptyState.classList.remove('hidden');
        if (query) {
            // Searched but no match
            DOM.emptyState.querySelector('h2').textContent = '검색 결과가 없습니다';
            DOM.emptyState.querySelector('p').textContent = '다른 검색어로 검색해보세요.';
            DOM.emptyState.querySelector('#btnEmptyAdd').classList.add('hidden');
        } else {
            // Absolutely empty
            DOM.emptyState.querySelector('h2').textContent = '등록된 연락처가 없습니다';
            DOM.emptyState.querySelector('p').textContent = '새로운 연락처를 추가하여 인맥을 편리하게 관리해보세요.';
            DOM.emptyState.querySelector('#btnEmptyAdd').classList.remove('hidden');
        }
        return;
    }
    
    DOM.emptyState.classList.add('hidden');
    
    // Build card elements html
    let gridHTML = '';
    filtered.forEach(c => {
        const initials = getInitials(c.name);
        const grad = getAvatarGradient(c.name);
        const escapedName = escapeHTML(c.name);
        const escapedPhone = escapeHTML(c.phone);
        const escapedEmail = escapeHTML(c.email);
        const escapedNotes = escapeHTML(c.notes);
        const formattedDate = formatDate(c.createdAt);
        
        gridHTML += `
            <div class="contact-card" data-id="${c.id}">
                <div>
                    <div class="card-header">
                        <div class="avatar" style="background: ${grad}">${initials}</div>
                        <div class="card-details">
                            <h3 class="card-name" title="${escapedName}">${escapedName}</h3>
                            <span class="card-date">등록일: ${formattedDate}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="info-item">
                            <i data-lucide="phone"></i>
                            <span>${escapedPhone}</span>
                        </div>
                        ${c.email ? `
                        <div class="info-item">
                            <i data-lucide="mail"></i>
                            <span title="${escapedEmail}">${escapedEmail}</span>
                        </div>
                        ` : ''}
                        ${c.notes ? `
                        <div class="info-item notes">
                            <i data-lucide="sticky-note"></i>
                            <span>${escapedNotes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn-icon btn-icon-edit" onclick="openModal('${c.id}')" aria-label="수정">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete" onclick="openConfirmModal('${c.id}')" aria-label="삭제">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    DOM.contactsGrid.innerHTML = gridHTML;
    
    // Re-initialize Lucide Icons for dynamic content
    lucide.createIcons();
}
