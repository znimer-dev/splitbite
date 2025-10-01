// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  token?: string; // Optional token for authenticated user state
}

interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

interface Person {
  id: string;
  name: string;
  email?: string;
  isRegisteredUser: boolean;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  assignedTo: string[];
  sharedBy?: number;
  notes?: string;
  _id?: string;
}

interface SplitCalculation {
  personId: string;
  name: string;
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  items: Array<{
    itemName: string;
    fullPrice: number;
    shareAmount: number;
    sharedWith: string[];
  }>;
}

interface Restaurant {
  _id: string;
  name: string;
  address?: string;
  cuisine?: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
  isFavorite: boolean;
  notes?: string;
}

interface Receipt {
  _id: string;
  restaurantName: string;
  restaurantAddress?: string;
  date: string;
  items: ReceiptItem[];
  people: Person[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  imageUrl: string;
  processingStatus: string;
  ocrConfidence?: number;
  splitCalculations?: SplitCalculation[];
  taxDistribution: 'proportional' | 'equal';
  tipDistribution: 'proportional' | 'equal';
  isComplete: boolean;
  createdAt: string;
  signedImageUrl?: string;
}

interface ReceiptsResponse {
  success: boolean;
  receipts: Receipt[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalReceipts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ReceiptResponse {
  success: boolean;
  receipt: Receipt;
}

interface UploadResponse {
  success: boolean;
  message: string;
  receipt: Receipt;
}

interface ApiError {
  success: false;
  error: string;
  message: string;
}

type ApiResponse<T> = T | ApiError;

// Configuration
const API_BASE: string = 'http://localhost:5000/api';

// Global state
let currentUser: User | null = null;

// DOM Elements with proper typing
const sections = {
    landing: document.getElementById('landing') as HTMLElement,
    loginSection: document.getElementById('loginSection') as HTMLElement,
    signupSection: document.getElementById('signupSection') as HTMLElement,
    dashboard: document.getElementById('dashboard') as HTMLElement
};

const buttons = {
    login: document.getElementById('loginBtn') as HTMLButtonElement,
    signup: document.getElementById('signupBtn') as HTMLButtonElement,
    logout: document.getElementById('logoutBtn') as HTMLButtonElement,
    getStarted: document.getElementById('getStartedBtn') as HTMLButtonElement,
    upload: document.getElementById('uploadBtn') as HTMLButtonElement,
    switchToSignup: document.getElementById('switchToSignup') as HTMLAnchorElement,
    switchToLogin: document.getElementById('switchToLogin') as HTMLAnchorElement,
    cancelUpload: document.getElementById('cancelUpload') as HTMLButtonElement
};

const forms = {
    login: document.getElementById('loginForm') as HTMLFormElement,
    signup: document.getElementById('signupForm') as HTMLFormElement,
    upload: document.getElementById('uploadForm') as HTMLFormElement
};

const elements = {
    userName: document.getElementById('userName') as HTMLSpanElement,
    uploadSection: document.getElementById('uploadSection') as HTMLElement,
    receiptsList: document.getElementById('receiptsList') as HTMLElement,
    uploadProgress: document.getElementById('uploadProgress') as HTMLElement,
    loadingSpinner: document.getElementById('loadingSpinner') as HTMLElement,
    toast: document.getElementById('toast') as HTMLElement,
    receiptModal: document.getElementById('receiptModal') as HTMLElement,
    receiptDetails: document.getElementById('receiptDetails') as HTMLElement
};

// Utility Functions
function showSection(sectionName: keyof typeof sections): void {
    Object.values(sections).forEach(section => section?.classList.add('hidden'));
    if (sections[sectionName]) {
        sections[sectionName].classList.remove('hidden');
    }
}

function showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

function showLoading(): void {
    elements.loadingSpinner.classList.remove('hidden');
}

function hideLoading(): void {
    elements.loadingSpinner.classList.add('hidden');
}

function resetFileLabel(): void {
    const fileLabel = document.querySelector('.file-text') as HTMLElement;
    if (fileLabel) {
        fileLabel.textContent = 'Choose receipt image (PNG, JPG)';
        fileLabel.style.color = '';
    }
}

function updateNavigation(): void {
    if (currentUser) {
        buttons.login.classList.add('hidden');
        buttons.signup.classList.add('hidden');
        buttons.logout.classList.remove('hidden');
        elements.userName.textContent = currentUser.name;
    } else {
        buttons.login.classList.remove('hidden');
        buttons.signup.classList.remove('hidden');
        buttons.logout.classList.add('hidden');
    }
}

// API Functions with proper typing
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(currentUser?.token && { 'Authorization': `Bearer ${currentUser.token}` }),
            ...(currentUser?.id && { 'user-id': currentUser.id }),
            ...options.headers
        };

        console.log('API Call:', endpoint, 'Headers:', headers);

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers,
            ...options
        });

        const data: T = await response.json();

        if (!response.ok) {
            const errorData = data as unknown as ApiError;
            throw new Error(errorData.message || errorData.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
    return await apiCall<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

async function login(email: string, password: string): Promise<AuthResponse> {
    return await apiCall<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function uploadReceipt(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await fetch(`${API_BASE}/receipts/upload`, {
        method: 'POST',
        headers: {
            ...(currentUser?.token && { 'Authorization': `Bearer ${currentUser.token}` }),
            ...(currentUser?.id && { 'user-id': currentUser.id })
        },
        body: formData
    });

    const data: UploadResponse = await response.json();

    if (!response.ok) {
        const errorData = data as unknown as ApiError;
        throw new Error(errorData.message || errorData.error || 'Upload failed');
    }

    return data;
}

async function getReceipts(): Promise<ReceiptsResponse> {
    return await apiCall<ReceiptsResponse>('/receipts');
}

async function getReceipt(id: string): Promise<ReceiptResponse> {
    return await apiCall<ReceiptResponse>(`/receipts/${id}`);
}

async function addPeopleToReceipt(receiptId: string, people: Person[]): Promise<{success: boolean; people: Person[]}> {
    return await apiCall(`/receipts/${receiptId}/people`, {
        method: 'POST',
        body: JSON.stringify({ people })
    });
}

async function assignItemToPeople(receiptId: string, itemIndex: number, assignedTo: string[], notes?: string): Promise<{success: boolean; splits: SplitCalculation[]}> {
    return await apiCall(`/receipts/${receiptId}/items/${itemIndex}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo, notes })
    });
}

async function updateDistribution(receiptId: string, taxDistribution?: string, tipDistribution?: string): Promise<{success: boolean; splits: SplitCalculation[]}> {
    return await apiCall(`/receipts/${receiptId}/distribution`, {
        method: 'PUT',
        body: JSON.stringify({ taxDistribution, tipDistribution })
    });
}

async function getSplitCalculation(receiptId: string): Promise<{success: boolean; splits: SplitCalculation[]; stats: any; unassignedItems: any[]}> {
    return await apiCall(`/receipts/${receiptId}/split`);
}

async function getShareableSummary(receiptId: string): Promise<{success: boolean; summary: string; splits: SplitCalculation[]}> {
    return await apiCall(`/receipts/${receiptId}/summary`);
}

async function finalizeSplit(receiptId: string, userAmount: number): Promise<{success: boolean; message: string}> {
    console.log('finalizeSplit called with:', { receiptId, userAmount });
    console.log('Current user in finalizeSplit:', currentUser);

    return await apiCall(`/receipts/${receiptId}/finalize-split`, {
        method: 'PUT',
        body: JSON.stringify({ userAmount })
    });
}

async function getRestaurants(): Promise<{success: boolean; restaurants: Restaurant[]}> {
    return await apiCall('/receipts/restaurants');
}

async function deleteRestaurant(restaurantName: string): Promise<{success: boolean; message: string}> {
    return await apiCall(`/receipts/restaurants/${encodeURIComponent(restaurantName)}`, {
        method: 'DELETE'
    });
}

async function clearRestaurantHistory(): Promise<{success: boolean; message: string; deletedCount: number}> {
    return await apiCall('/receipts/restaurants', {
        method: 'DELETE'
    });
}

async function toggleRestaurantFavorite(restaurantName: string): Promise<{success: boolean; restaurant: Restaurant}> {
    return await apiCall(`/receipts/restaurants/${encodeURIComponent(restaurantName)}/favorite`, {
        method: 'PUT'
    });
}

async function deleteReceipt(receiptId: string): Promise<{success: boolean; message: string}> {
    return await apiCall(`/receipts/${receiptId}`, {
        method: 'DELETE'
    });
}

// Global flag to prevent double submissions
let isUploading = false;

// Bill Splitting State
let currentReceipt: Receipt | null = null;
let currentSplitPeople: Person[] = [];
let currentSplitCalculations: SplitCalculation[] = [];

// Bill Splitting Functions
function openBillSplitting(receiptId: string): void {
    console.log('openBillSplitting called with ID:', receiptId);
    const splitModal = document.getElementById('splitModal') as HTMLElement;
    console.log('Split modal element:', splitModal);
    splitModal.classList.remove('hidden');
    console.log('Modal classes after removing hidden:', splitModal.className);

    // Reset to first step
    showSplitStep('people');
    loadReceiptForSplitting(receiptId);
}

async function loadReceiptForSplitting(receiptId: string): Promise<void> {
    try {
        showLoading();
        const result = await getReceipt(receiptId);
        currentReceipt = result.receipt;

        // Update modal header
        const restaurantName = document.getElementById('splitRestaurantName') as HTMLElement;
        restaurantName.textContent = currentReceipt.restaurantName;

        // Add default "me" person if no people exist yet
        if (!currentReceipt.people || currentReceipt.people.length === 0) {
            const defaultPerson: Person = {
                id: `person_me_${Date.now()}`,
                name: 'Me',
                email: undefined,
                isRegisteredUser: true
            };
            currentSplitPeople = [defaultPerson];
            displaySplitPeople();

            // Enable continue button since we have at least one person
            const continueBtn = document.getElementById('continueToItemsBtn') as HTMLButtonElement;
            continueBtn.disabled = false;
        }

        // Load existing people if any
        if (currentReceipt.people && currentReceipt.people.length > 0) {
            currentSplitPeople = [...currentReceipt.people];
            displaySplitPeople();

            // If split is already in progress, offer to continue or restart
            const hasAssignments = currentReceipt.items.some(item =>
                item.assignedTo && item.assignedTo.length > 0
            );

            if (hasAssignments) {
                const continueConfirm = confirm(
                    `Split is already in progress for ${currentReceipt.restaurantName}. Would you like to continue where you left off?\n\nClick OK to continue, or Cancel to restart from the beginning.`
                );

                if (continueConfirm) {
                    // Continue to items step
                    showSplitStep('items');
                    setupSplitMethodHandlers();
                    setupItemsAssignment();
                    updateSplitMethodDisplay();
                    return;
                }
                // If they choose to restart, clear assignments
                else {
                    currentReceipt.items.forEach(item => {
                        item.assignedTo = [];
                    });
                }
            }
        }

    } catch (error) {
        showToast('Failed to load receipt for splitting', 'error');
    } finally {
        hideLoading();
    }
}

function showSplitStep(step: 'people' | 'items' | 'results'): void {
    const steps = ['people', 'items', 'results'];
    steps.forEach(s => {
        const stepElement = document.getElementById(`${s}Step`) as HTMLElement;
        stepElement.classList.add('hidden');
    });

    const activeStep = document.getElementById(`${step}Step`) as HTMLElement;
    activeStep.classList.remove('hidden');
}

// People Management
function addPersonToSplit(): void {
    const nameInput = document.getElementById('personNameInput') as HTMLInputElement;
    const emailInput = document.getElementById('personEmailInput') as HTMLInputElement;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }

    // Check if person already exists
    if (currentSplitPeople.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('Person already added', 'error');
        return;
    }

    const person: Person = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email: email || undefined,
        isRegisteredUser: false
    };

    currentSplitPeople.push(person);
    displaySplitPeople();

    // Clear inputs
    nameInput.value = '';
    emailInput.value = '';
    nameInput.focus();

    // Enable continue button if we have people
    const continueBtn = document.getElementById('continueToItemsBtn') as HTMLButtonElement;
    continueBtn.disabled = currentSplitPeople.length === 0;
}

function displaySplitPeople(): void {
    const peopleList = document.getElementById('peopleList') as HTMLElement;

    if (currentSplitPeople.length === 0) {
        peopleList.innerHTML = '<p class="no-people">No people added yet</p>';
        return;
    }

    peopleList.innerHTML = currentSplitPeople.map((person, index) => `
        <div class="person-item">
            <div class="person-info">
                <span class="person-name">${person.name}</span>
                ${person.email ? `<span class="person-email">${person.email}</span>` : ''}
            </div>
            <button class="remove-person-btn" onclick="removePersonFromSplit(${index})">×</button>
        </div>
    `).join('');
}

function removePersonFromSplit(index: number): void {
    currentSplitPeople.splice(index, 1);
    displaySplitPeople();

    // Update continue button
    const continueBtn = document.getElementById('continueToItemsBtn') as HTMLButtonElement;
    continueBtn.disabled = currentSplitPeople.length === 0;
}

async function continueToItems(): Promise<void> {
    if (!currentReceipt || currentSplitPeople.length === 0) {
        showToast('Please add people first', 'error');
        return;
    }

    try {
        showLoading();

        // Save people to receipt
        await addPeopleToReceipt(currentReceipt._id, currentSplitPeople);

        // Update current receipt with people
        currentReceipt.people = currentSplitPeople;

        // Show items step
        showSplitStep('items');
        setupSplitMethodHandlers();
        setupItemsAssignment();
        updateSplitMethodDisplay();

    } catch (error) {
        showToast('Failed to save people', 'error');
    } finally {
        hideLoading();
    }
}

function setupSplitMethodHandlers(): void {
    const itemMethodRadio = document.getElementById('itemMethod') as HTMLInputElement;
    const percentageMethodRadio = document.getElementById('percentageMethod') as HTMLInputElement;

    itemMethodRadio?.addEventListener('change', updateSplitMethodDisplay);
    percentageMethodRadio?.addEventListener('change', updateSplitMethodDisplay);
}

function updateSplitMethodDisplay(): void {
    const itemMethod = document.getElementById('itemMethod') as HTMLInputElement;
    const itemsAssignment = document.getElementById('itemsAssignment') as HTMLElement;
    const percentageAssignment = document.getElementById('percentageAssignment') as HTMLElement;

    if (itemMethod?.checked) {
        itemsAssignment?.classList.remove('hidden');
        percentageAssignment?.classList.add('hidden');
        setupItemsAssignment();
    } else {
        itemsAssignment?.classList.add('hidden');
        percentageAssignment?.classList.remove('hidden');
        setupPercentageAssignment();
    }
}

function setupPercentageAssignment(): void {
    if (!currentReceipt || !currentSplitPeople.length) return;

    const percentageControls = document.getElementById('percentageControls') as HTMLElement;
    const equalPercentage = Math.floor(100 / currentSplitPeople.length);

    percentageControls.innerHTML = currentSplitPeople.map((person, index) => `
        <div class="percentage-control">
            <label for="person-${person.id}">${person.name}</label>
            <input
                type="range"
                id="person-${person.id}"
                min="0"
                max="100"
                value="${equalPercentage}"
                data-person-id="${person.id}"
                class="percentage-slider"
            >
            <div class="percentage-value">${equalPercentage}%</div>
            <div class="amount-value">$${(currentReceipt!.total * equalPercentage / 100).toFixed(2)}</div>
        </div>
    `).join('');

    // Add event listeners to sliders
    document.querySelectorAll('.percentage-slider').forEach(slider => {
        slider.addEventListener('input', updatePercentageDisplay);
    });

    updatePercentageDisplay();
}

function updatePercentageDisplay(): void {
    if (!currentReceipt) return;

    let totalPercentage = 0;
    const sliders = document.querySelectorAll('.percentage-slider') as NodeListOf<HTMLInputElement>;

    sliders.forEach(slider => {
        const percentage = parseInt(slider.value);
        totalPercentage += percentage;

        // Update the display values
        const control = slider.closest('.percentage-control') as HTMLElement;
        const percentageValue = control.querySelector('.percentage-value') as HTMLElement;
        const amountValue = control.querySelector('.amount-value') as HTMLElement;

        percentageValue.textContent = `${percentage}%`;
        amountValue.textContent = `$${(currentReceipt!.total * percentage / 100).toFixed(2)}`;
    });

    // Update summary
    const totalPercentageEl = document.getElementById('totalPercentage') as HTMLElement;
    const remainingAmountEl = document.getElementById('remainingAmount') as HTMLElement;

    totalPercentageEl.textContent = totalPercentage.toString();

    const remainingPercentage = 100 - totalPercentage;
    const remainingAmount = currentReceipt!.total * remainingPercentage / 100;
    remainingAmountEl.textContent = remainingAmount.toFixed(2);

    // Update colors based on whether total is 100%
    const summary = document.querySelector('.percentage-summary') as HTMLElement;
    if (totalPercentage === 100) {
        summary.style.borderColor = '#28a745';
        remainingAmountEl.style.color = '#28a745';
    } else if (totalPercentage > 100) {
        summary.style.borderColor = '#dc3545';
        remainingAmountEl.style.color = '#dc3545';
    } else {
        summary.style.borderColor = '#ffc107';
        remainingAmountEl.style.color = '#ffc107';
    }
}

// Items Assignment
function setupItemsAssignment(): void {
    if (!currentReceipt) return;

    const itemsList = document.getElementById('itemsList') as HTMLElement;
    const peopleColumns = document.getElementById('peopleColumns') as HTMLElement;

    // Create items list - only show unassigned items
    const unassignedItems = currentReceipt.items.filter(item =>
        !item.assignedTo || item.assignedTo.length === 0
    );

    itemsList.innerHTML = unassignedItems.length > 0 ?
        unassignedItems.map((item, arrayIndex) => {
            // Find the original index in the full items array
            const originalIndex = currentReceipt!.items.findIndex(i =>
                i.name === item.name && i.price === item.price && i.quantity === item.quantity
            );

            return `
                <div class="item-card" draggable="true" data-item-index="${originalIndex}">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <span class="item-quantity">×${item.quantity}</span>
                        <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div class="item-status">
                        <span class="unassigned-badge">Unassigned</span>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="no-items">🎉 All items have been assigned!</div>';

    // Create people columns
    peopleColumns.innerHTML = currentSplitPeople.map(person => `
        <div class="person-column" data-person-id="${person.id}">
            <div class="person-column-header">
                <h4>${person.name}</h4>
                <div class="person-total">$0.00</div>
            </div>
            <div class="person-items" data-person-id="${person.id}">
                ${currentReceipt!.items.filter(item =>
                    item.assignedTo && item.assignedTo.includes(person.id)
                ).map((item, itemIndex) => {
                    const originalIndex = currentReceipt!.items.findIndex(i =>
                        i.name === item.name && i.price === item.price && i.quantity === item.quantity
                    );
                    return `
                        <div class="assigned-item clickable" data-item-index="${originalIndex}" onclick="unassignItem(${originalIndex})" title="Click to unassign">
                            <span>${item.name}</span>
                            <span>$${(item.price * item.quantity / (item.assignedTo?.length || 1)).toFixed(2)}</span>
                            <span class="unassign-hint">×</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');

    // Setup drag and drop
    setupDragAndDrop();
    updatePersonTotals();
}

function setupDragAndDrop(): void {
    console.log('Setting up drag and drop');

    // Add drag event listeners to items
    const items = document.querySelectorAll('.item-card');
    console.log('Found', items.length, 'draggable items');

    items.forEach((item, index) => {
        const htmlItem = item as HTMLElement;
        htmlItem.setAttribute('draggable', 'true');

        htmlItem.addEventListener('dragstart', handleDragStart);
        htmlItem.addEventListener('dragend', handleDragEnd);

        console.log('Added drag listeners to item', index);
    });

    // Add drop event listeners to person columns and person column headers
    const personColumns = document.querySelectorAll('.person-items');
    const personColumnContainers = document.querySelectorAll('.person-column');

    console.log('Found', personColumns.length, 'person drop zones');
    console.log('Found', personColumnContainers.length, 'person containers');

    // Add to both person-items and person-column for larger drop area
    [...personColumns, ...personColumnContainers].forEach((column, index) => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);

        console.log('Added drop listeners to column', index);
    });

    // Items now only support drag & drop - no click assignment modal
}

let draggedItem: HTMLElement | null = null;
let draggedItemIndex: number = -1;

function handleDragStart(e: Event): void {
    const dragEvent = e as DragEvent;
    draggedItem = dragEvent.target as HTMLElement;
    draggedItemIndex = parseInt(draggedItem.dataset.itemIndex || '-1');

    console.log('Drag started for item index:', draggedItemIndex);

    draggedItem.classList.add('dragging');

    // Set data transfer for better browser support
    if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', draggedItemIndex.toString());
    }
}

function handleDragEnd(e: Event): void {
    console.log('Drag ended');

    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
        draggedItemIndex = -1;
    }

    // Clean up any remaining drag-over states
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleDragOver(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    const dragEvent = e as DragEvent;
    if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'move';
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
}

function handleDragLeave(e: Event): void {
    const target = e.currentTarget as HTMLElement;

    // Only remove drag-over if we're actually leaving the element
    // (not just moving to a child element)
    const rect = target.getBoundingClientRect();
    const dragEvent = e as DragEvent;
    const x = dragEvent.clientX;
    const y = dragEvent.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        target.classList.remove('drag-over');
    }
}

function handleDrop(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    console.log('Drop event triggered on:', target.className);

    if (draggedItemIndex === -1 || !currentReceipt) {
        console.log('No valid item being dragged');
        return;
    }

    // Find the person ID from the target or its parent
    let personId = target.dataset.personId;
    if (!personId) {
        // Check parent elements for person ID
        let parent = target.parentElement;
        while (parent && !personId) {
            personId = parent.dataset.personId;
            parent = parent.parentElement;
        }
    }

    if (!personId) {
        console.log('No person ID found for drop target');
        return;
    }

    console.log('Assigning item', draggedItemIndex, 'to person', personId);
    assignItemToPerson(draggedItemIndex, personId);
}

// Modal assignment functions removed - using drag & drop + click to unassign only

async function assignItemToPerson(itemIndex: number, personId: string): Promise<void> {
    if (!currentReceipt) return;

    try {
        const currentAssignments = currentReceipt.items[itemIndex].assignedTo || [];
        let newAssignments: string[];

        if (currentAssignments.includes(personId)) {
            // Remove assignment
            newAssignments = currentAssignments.filter(id => id !== personId);
        } else {
            // Add assignment
            newAssignments = [...currentAssignments, personId];
        }

        await assignItemToPeople(currentReceipt._id, itemIndex, newAssignments);

        // Update local state
        currentReceipt.items[itemIndex].assignedTo = newAssignments;

        // Refresh display
        setupItemsAssignment();

    } catch (error) {
        showToast('Failed to assign item', 'error');
    }
}

function updatePersonTotals(): void {
    if (!currentReceipt) return;

    currentSplitPeople.forEach(person => {
        let total = 0;

        currentReceipt!.items.forEach(item => {
            if (item.assignedTo && item.assignedTo.includes(person.id)) {
                total += (item.price * item.quantity) / item.assignedTo.length;
            }
        });

        const totalElement = document.querySelector(`[data-person-id="${person.id}"] .person-total`) as HTMLElement;
        if (totalElement) {
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    });
}

async function calculateSplit(): Promise<void> {
    if (!currentReceipt) return;

    try {
        showLoading();

        // Check which split method is selected
        const itemMethod = document.getElementById('itemMethod') as HTMLInputElement;
        const isItemBasedSplit = itemMethod?.checked;

        if (isItemBasedSplit) {
            // Item-based splitting (existing logic)
            const taxDistribution = (document.getElementById('taxDistribution') as HTMLSelectElement).value;
            const tipDistribution = (document.getElementById('tipDistribution') as HTMLSelectElement).value;

            await updateDistribution(currentReceipt._id, taxDistribution, tipDistribution);
            const result = await getSplitCalculation(currentReceipt._id);
            currentSplitCalculations = result.splits;

            showSplitStep('results');
            displaySplitResults(result.splits, result.stats, result.unassignedItems);
        } else {
            // Percentage-based splitting
            const percentageCalculations = calculatePercentageSplit();
            currentSplitCalculations = percentageCalculations;

            showSplitStep('results');
            displayPercentageResults(percentageCalculations);
        }
    } catch (error) {
        showToast('Failed to calculate split', 'error');
    } finally {
        hideLoading();
    }
}

function calculatePercentageSplit(): SplitCalculation[] {
    if (!currentReceipt) return [];

    const sliders = document.querySelectorAll('.percentage-slider') as NodeListOf<HTMLInputElement>;
    const calculations: SplitCalculation[] = [];

    sliders.forEach(slider => {
        const personId = slider.dataset.personId || '';
        const percentage = parseInt(slider.value);
        const person = currentSplitPeople.find(p => p.id === personId);

        if (person && percentage > 0) {
            const totalAmount = currentReceipt!.total * (percentage / 100);
            const subtotalAmount = currentReceipt!.subtotal * (percentage / 100);
            const taxAmount = currentReceipt!.tax * (percentage / 100);
            const tipAmount = currentReceipt!.tip * (percentage / 100);

            calculations.push({
                personId: person.id,
                name: person.name,
                subtotal: subtotalAmount,
                taxShare: taxAmount,
                tipShare: tipAmount,
                total: totalAmount,
                items: [] // No specific items for percentage split
            });
        }
    });

    return calculations;
}

function displayPercentageResults(calculations: SplitCalculation[]): void {
    const resultsContainer = document.getElementById('splitResults') as HTMLElement;

    const html = `
        <div class="split-summary">
            <h4>💰 Split Results (By Percentage)</h4>
            <div class="split-results-grid">
                ${calculations.map(calc => `
                    <div class="person-result">
                        <h5>${calc.name}</h5>
                        <div class="person-breakdown">
                            <div class="breakdown-line total">
                                <span>Total:</span>
                                <span>$${calc.total.toFixed(2)}</span>
                            </div>
                            <div class="breakdown-line">
                                <span>Food:</span>
                                <span>$${calc.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="breakdown-line">
                                <span>Tax:</span>
                                <span>$${calc.taxShare.toFixed(2)}</span>
                            </div>
                            <div class="breakdown-line">
                                <span>Tip:</span>
                                <span>$${calc.tipShare.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="total-verification">
                <strong>Grand Total: $${calculations.reduce((sum, calc) => sum + calc.total, 0).toFixed(2)}</strong>
                <span>(Original: $${currentReceipt?.total.toFixed(2)})</span>
            </div>
        </div>
    `;

    resultsContainer.innerHTML = html;
}

function displaySplitResults(splits: SplitCalculation[], stats: any, unassignedItems: any[]): void {
    const resultsContainer = document.getElementById('splitResults') as HTMLElement;

    let html = `
        <div class="split-summary">
            <h4>Split Summary</h4>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-label">Total Amount:</span>
                    <span class="stat-value">$${currentReceipt?.total.toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">People:</span>
                    <span class="stat-value">${splits.length}</span>
                </div>
            </div>
        </div>
    `;

    if (unassignedItems.length > 0) {
        html += `
            <div class="unassigned-warning">
                <h4>⚠️ Unassigned Items</h4>
                <p>The following items haven't been assigned to anyone:</p>
                <ul>
                    ${unassignedItems.map(item => `
                        <li>${item.name} - $${(item.price * item.quantity).toFixed(2)}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    html += `
        <div class="person-splits">
            ${splits.map(split => `
                <div class="person-split">
                    <div class="person-split-header">
                        <h4>${split.name}</h4>
                        <div class="person-split-total">$${split.total.toFixed(2)}</div>
                    </div>
                    <div class="person-split-breakdown">
                        <div class="breakdown-line">
                            <span>Subtotal:</span>
                            <span>$${split.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="breakdown-line">
                            <span>Tax:</span>
                            <span>$${split.taxShare.toFixed(2)}</span>
                        </div>
                        <div class="breakdown-line">
                            <span>Tip:</span>
                            <span>$${split.tipShare.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="person-items">
                        <h5>Items:</h5>
                        ${split.items.map(item => `
                            <div class="split-item">
                                <span>${item.itemName}${item.sharedWith.length > 0 ? ' (shared)' : ''}</span>
                                <span>$${item.shareAmount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    resultsContainer.innerHTML = html;
}

// Export and Share Functions
async function exportSummary(): Promise<void> {
    if (!currentReceipt) return;

    try {
        const result = await getShareableSummary(currentReceipt._id);

        // Create downloadable text file
        const blob = new Blob([result.summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentReceipt.restaurantName}_split_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Summary exported successfully!', 'success');
    } catch (error) {
        showToast('Failed to export summary', 'error');
    }
}

async function shareSplit(): Promise<void> {
    if (!currentReceipt) return;

    try {
        const result = await getShareableSummary(currentReceipt._id);

        if (navigator.share) {
            await navigator.share({
                title: `${currentReceipt.restaurantName} - Bill Split`,
                text: result.summary
            });
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(result.summary);
            showToast('Split summary copied to clipboard!', 'success');
        }
    } catch (error) {
        showToast('Failed to share split', 'error');
    }
}

async function saveSplit(): Promise<void> {
    if (!currentReceipt) {
        showToast('No receipt data to save', 'error');
        return;
    }

    try {
        showLoading();

        // Get current split calculations to ensure we have the latest data
        let splitCalculations = currentSplitCalculations;

        // If no split calculations exist, calculate them now
        if (!splitCalculations || splitCalculations.length === 0) {
            try {
                const splitResult = await getSplitCalculation(currentReceipt._id);
                if (!splitResult.success) {
                    showToast('Failed to calculate split before saving', 'error');
                    return;
                }
                splitCalculations = splitResult.splits;
            } catch (calcError) {
                console.error('Error calculating split:', calcError);
                showToast('Failed to calculate split', 'error');
                return;
            }
        }

        console.log('Split calculations:', splitCalculations);
        console.log('Current split people:', currentSplitPeople);

        // Find the "Me" person's total amount - check multiple patterns
        const mePerson = splitCalculations.find(calc => {
            const nameLower = calc.name.toLowerCase();
            return nameLower === 'me' ||
                   calc.personId.includes('person_me_') ||
                   calc.personId.includes('me_');
        });

        console.log('Found me person:', mePerson);

        if (!mePerson) {
            showToast('Could not find your amount in the split. Make sure you have assigned items to yourself.', 'error');
            console.error('Available people in split:', splitCalculations.map(calc => ({ name: calc.name, id: calc.personId })));
            return;
        }

        const userAmount = mePerson.total;
        console.log('User amount to save:', userAmount);

        if (userAmount <= 0) {
            showToast('Your amount is $0. Please assign some items to yourself before saving.', 'error');
            return;
        }

        // Finalize the split with the user's amount
        console.log('Current user for finalize split:', currentUser);
        console.log('User ID being sent:', currentUser?.id);
        console.log('Token being sent:', currentUser?.token);
        await finalizeSplit(currentReceipt._id, userAmount);

        showToast(`Split saved successfully! Your amount: $${userAmount.toFixed(2)}`, 'success');

        // Ask if user wants to see the final split summary
        const showSummary = confirm(
            `Split saved successfully! Your amount: $${userAmount.toFixed(2)}\n\n` +
            `Would you like to see the complete split summary before closing?`
        );

        if (showSummary) {
            await showCompletedSplitSummary(currentReceipt, splitCalculations, userAmount);
        } else {
            closeSplitModal();
        }

    } catch (error) {
        console.error('Error saving split:', error);
        showToast(`Failed to save split: ${(error as Error).message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function showCompletedSplitSummary(receipt: Receipt, splitCalculations: SplitCalculation[], userAmount: number): Promise<void> {
    try {
        // Get the shareable summary from the backend
        const result = await getShareableSummary(receipt._id);

        // Create a modal to show the completed split
        const summaryModal = document.createElement('div');
        summaryModal.className = 'modal';
        summaryModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>🎉 Split Complete - ${receipt.restaurantName}</h2>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="completed-split-summary">
                        <div class="user-highlight">
                            <h3>💰 Your Amount: $${userAmount.toFixed(2)}</h3>
                            <p>This amount has been added to your restaurant history.</p>
                        </div>

                        <div class="split-breakdown">
                            <h4>Complete Split Breakdown:</h4>
                            ${splitCalculations.map(calc => `
                                <div class="person-summary ${calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_') ? 'highlight-user' : ''}">
                                    <div class="person-name">${calc.name}${calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_') ? ' (You)' : ''}</div>
                                    <div class="person-amount">$${calc.total.toFixed(2)}</div>
                                    <div class="person-details">
                                        Food: $${calc.subtotal.toFixed(2)} |
                                        Tax: $${calc.taxShare.toFixed(2)} |
                                        Tip: $${calc.tipShare.toFixed(2)}
                                    </div>
                                    ${calc.items.length > 0 ? `
                                        <div class="person-items">
                                            ${calc.items.map(item => `
                                                <span class="item-tag">${item.itemName}: $${item.shareAmount.toFixed(2)}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>

                        <div class="receipt-total">
                            <strong>Original Total: $${receipt.total.toFixed(2)}</strong><br>
                            <strong>Split Total: $${splitCalculations.reduce((sum, calc) => sum + calc.total, 0).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText(\`${result.summary.replace(/`/g, '\\`')}\`).then(() => showToast('Summary copied to clipboard!', 'success'))">
                        📋 Copy Summary
                    </button>
                    <button class="btn-primary" onclick="this.closest('.modal').remove(); closeSplitModal();">
                        ✅ Done
                    </button>
                </div>
            </div>
        `;

        // Add CSS for the summary modal
        const style = document.createElement('style');
        style.textContent = `
            .completed-split-summary .user-highlight {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 1.5rem;
            }
            .completed-split-summary .person-summary {
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 0.5rem;
                background: #f8f9fa;
            }
            .completed-split-summary .person-summary.highlight-user {
                border-color: #28a745;
                background: #e8f5e8;
            }
            .completed-split-summary .person-name {
                font-weight: bold;
                font-size: 1.1rem;
                margin-bottom: 0.25rem;
            }
            .completed-split-summary .person-amount {
                font-size: 1.2rem;
                color: #28a745;
                font-weight: bold;
            }
            .completed-split-summary .person-details {
                font-size: 0.9rem;
                color: #666;
                margin: 0.25rem 0;
            }
            .completed-split-summary .person-items {
                margin-top: 0.5rem;
            }
            .completed-split-summary .item-tag {
                display: inline-block;
                background: #e9ecef;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
                margin: 0.1rem;
                font-size: 0.8rem;
            }
            .completed-split-summary .receipt-total {
                text-align: center;
                padding: 1rem;
                border-top: 2px solid #dee2e6;
                margin-top: 1rem;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(summaryModal);
        summaryModal.classList.remove('hidden');

    } catch (error) {
        console.error('Error showing split summary:', error);
        showToast('Could not load split summary', 'error');
        closeSplitModal();
    }
}

function closeSplitModal(): void {
    const splitModal = document.getElementById('splitModal') as HTMLElement;
    splitModal.classList.add('hidden');

    // Reset state
    currentReceipt = null;
    currentSplitPeople = [];
    currentSplitCalculations = [];

    // Refresh receipts to show updated data
    loadReceipts();

    // Refresh restaurant history to show updated totals
    loadRestaurants();
}

// Unassign item function
function unassignItem(itemIndex: number): void {
    if (!currentReceipt) return;

    const item = currentReceipt.items[itemIndex];
    if (item) {
        item.assignedTo = []; // Clear all assignments
        setupItemsAssignment(); // Refresh the display
        showToast(`"${item.name}" has been unassigned`, 'success');
    }
}

// Global functions for onclick handlers
(window as any).removePersonFromSplit = removePersonFromSplit;
(window as any).unassignItem = unassignItem;
// Modal functions removed

// Delete receipt confirmation function
(window as any).confirmDeleteReceipt = async (receiptId: string, restaurantName: string, event?: Event) => {
    // Prevent event bubbling to avoid triggering card click
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const confirmed = confirm(`Are you sure you want to delete the receipt from ${restaurantName}? This action cannot be undone.`);
    if (confirmed) {
        try {
            showLoading();
            await deleteReceipt(receiptId);
            showToast('Receipt deleted successfully', 'success');
            await loadReceipts(); // Refresh the receipts list
        } catch (error) {
            showToast(`Failed to delete receipt: ${(error as Error).message}`, 'error');
        } finally {
            hideLoading();
        }
    }
};
(window as any).openBillSplitting = openBillSplitting;

// Dashboard Functions
async function loadDashboard(): Promise<void> {
    try {
        await loadReceipts();
        await loadRestaurants();
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}

async function loadReceipts(): Promise<void> {
    try {
        const result = await getReceipts();
        displayReceipts(result.receipts || []);
    } catch (error) {
        showToast('Failed to load receipts', 'error');
        displayReceipts([]);
    }
}

async function loadRestaurants(): Promise<void> {
    try {
        console.log('loadRestaurants called');
        const result = await getRestaurants();
        console.log('Restaurants API result:', result);
        displayRestaurants(result.restaurants || []);
    } catch (error) {
        console.error('Error loading restaurants:', error);
        showToast('Failed to load restaurants', 'error');
        displayRestaurants([]);
    }
}

function displayRestaurants(restaurants: Restaurant[]): void {
    console.log('displayRestaurants called with', restaurants.length, 'restaurants');
    console.log('Current filter:', currentHistoryFilter);
    const restaurantsList = document.getElementById('restaurantsList') as HTMLElement;

    if (!restaurantsList) {
        console.error('restaurantsList element not found');
        return;
    }


    // Sort restaurants by most recent visit first
    const sortedRestaurants = [...restaurants].sort((a, b) =>
        new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    );

    // Apply current filter
    let filteredRestaurants = sortedRestaurants;
    switch (currentHistoryFilter) {
        case 'favorites':
            filteredRestaurants = sortedRestaurants.filter(r => r.isFavorite);
            break;
        default:
            filteredRestaurants = sortedRestaurants;
    }

    console.log('Filtered restaurants:', filteredRestaurants.length);

    if (filteredRestaurants.length === 0) {
        restaurantsList.innerHTML = '';
        return;
    }

    console.log('Creating restaurant cards for', filteredRestaurants.length, 'restaurants');

    // Restore grid layout when showing restaurant cards
    restaurantsList.style.display = 'grid';

    restaurantsList.innerHTML = filteredRestaurants.map(restaurant => `
        <div class="restaurant-card">
            <div class="restaurant-header">
                <div class="restaurant-name">${restaurant.name}</div>
                <div class="restaurant-actions">
                    <button class="favorite-btn ${restaurant.isFavorite ? 'active' : ''}"
                            onclick="toggleFavorite('${restaurant.name}')" title="Toggle favorite">
                        ${restaurant.isFavorite ? '❤️' : '🤍'}
                    </button>
                    <button class="delete-restaurant-btn"
                            onclick="deleteRestaurantFromHistory('${restaurant.name.replace(/'/g, "\\'")}')"
                            title="Delete entire restaurant history">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="restaurant-stats">
                <div class="stat">
                    <span class="stat-label">Visits:</span>
                    <span class="stat-value">${restaurant.visitCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Your Total Spent:</span>
                    <span class="stat-value">$${restaurant.totalSpent.toFixed(2)}</span>
                    <span class="stat-note">💡 Only your portion from splits</span>
                </div>
            </div>
            <div class="restaurant-last-visit">
                Last visit: ${new Date(restaurant.lastVisit).toLocaleDateString()}
            </div>
            ${restaurant.address ? `<div class="restaurant-address">${restaurant.address}</div>` : ''}
            <div class="restaurant-card-actions">
                <button class="btn-secondary btn-sm" onclick="showRestaurantVisits('${restaurant.name.replace(/'/g, "\\'")}')">
                    👁️ View All Visits (${restaurant.visitCount})
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleFavorite(restaurantName: string): Promise<void> {
    try {
        await toggleRestaurantFavorite(restaurantName);
        loadRestaurants(); // Refresh the display
        showToast('Favorite status updated', 'success');
    } catch (error) {
        showToast('Failed to update favorite', 'error');
    }
}

async function deleteRestaurantFromHistory(restaurantName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${restaurantName}" from your restaurant history? This cannot be undone.`)) {
        return;
    }

    try {
        showLoading();
        await deleteRestaurant(restaurantName);

        // Check if we're currently viewing visits for this restaurant
        const restaurantVisitsSection = document.getElementById('restaurantVisits');
        const visitsRestaurantName = document.getElementById('visitsRestaurantName');

        if (restaurantVisitsSection && !restaurantVisitsSection.classList.contains('hidden') &&
            visitsRestaurantName && visitsRestaurantName.textContent?.includes(restaurantName)) {
            // Hide the visits section since this restaurant was deleted
            hideRestaurantVisits();
        }

        loadRestaurants(); // Refresh the display
        showToast(`"${restaurantName}" deleted from history`, 'success');
    } catch (error) {
        showToast('Failed to delete restaurant', 'error');
    } finally {
        hideLoading();
    }
}

async function clearAllRestaurants(): Promise<void> {
    if (!confirm('Are you sure you want to clear ALL restaurant history? This cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        const result = await clearRestaurantHistory();

        // Hide visits section since all restaurants are being cleared
        hideRestaurantVisits();

        loadRestaurants(); // Refresh the display
        showToast(result.message, 'success');
    } catch (error) {
        showToast('Failed to clear restaurant history', 'error');
    } finally {
        hideLoading();
    }
}

// Dashboard Tab Functions
function showDashboardTab(tabName: 'receipts' | 'history'): void {
    console.log('showDashboardTab called with:', tabName);

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.getElementById(`${tabName}Tab`);
    console.log('Tab button found:', tabBtn);
    tabBtn?.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });
    const tabContent = document.getElementById(`${tabName}TabContent`);
    console.log('Tab content found:', tabContent);
    if (tabContent) {
        tabContent.classList.add('active');
        tabContent.classList.remove('hidden');
    }

    // Load data if needed
    if (tabName === 'history') {
        console.log('Loading restaurants for history tab');
        loadRestaurants();
    } else if (tabName === 'receipts') {
        console.log('Loading receipts for receipts tab');
        loadReceipts();
    }
}

// History Filter Functions
let currentHistoryFilter = 'all';

function filterHistory(filter: 'all' | 'favorites'): void {
    currentHistoryFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const target = event?.target as HTMLElement;
    target?.classList.add('active');

    // Reload restaurants with filter
    loadRestaurants();
}

// Restaurant Visits Functions
async function showRestaurantVisits(restaurantName: string): Promise<void> {
    try {
        showLoading();

        // Get all receipts for this restaurant
        const receiptsResult = await getReceipts();
        const restaurantReceipts = receiptsResult.receipts.filter(
            receipt => receipt.restaurantName === restaurantName
        );

        if (restaurantReceipts.length === 0) {
            showToast('No visits found for this restaurant', 'info');
            return;
        }

        // Show visits section
        document.getElementById('restaurantVisits')?.classList.remove('hidden');
        document.getElementById('visitsRestaurantName')!.textContent = `${restaurantName} - Visits (${restaurantReceipts.length})`;

        // Display visits
        displayRestaurantVisits(restaurantReceipts);

        // Scroll to visits section
        document.getElementById('restaurantVisits')?.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        showToast('Failed to load restaurant visits', 'error');
    } finally {
        hideLoading();
    }
}

function hideRestaurantVisits(): void {
    document.getElementById('restaurantVisits')?.classList.add('hidden');
}

function displayRestaurantVisits(receipts: Receipt[]): void {
    const visitsList = document.getElementById('visitsList') as HTMLElement;

    if (receipts.length === 0) {
        visitsList.innerHTML = '<p class="no-visits">No visits found</p>';
        return;
    }

    visitsList.innerHTML = receipts.map(receipt => `
        <div class="visit-card">
            <div class="visit-date">
                ${new Date(receipt.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </div>
            <div class="visit-amount">
                ${receipt.isComplete ?
                    `$${calculateUserAmountFromReceipt(receipt).toFixed(2)} (Your portion)` :
                    `$${receipt.total.toFixed(2)} (Full amount)`
                }
            </div>
            <div class="visit-details">
                ${receipt.items.length} items • ${receipt.people?.length || 0} people
                ${receipt.isComplete ? ' • ✅ Split completed' : ''}
            </div>
            <div class="visit-actions">
                <button class="btn-sm btn-secondary" onclick="showReceiptDetails('${receipt._id}')">
                    View Details
                </button>
                ${!receipt.isComplete ? `
                    <button class="btn-sm btn-primary" onclick="openBillSplitting('${receipt._id}')">
                        Split Bill
                    </button>
                ` : ''}
                <button class="btn-sm btn-danger" onclick="deleteSpecificVisit('${receipt._id}', '${receipt.restaurantName}', '${receipt.date}')">
                    Delete Visit
                </button>
            </div>
        </div>
    `).join('');
}

function calculateUserAmountFromReceipt(receipt: Receipt): number {
    if (!receipt.splitCalculations || receipt.splitCalculations.length === 0) {
        return receipt.total; // Fallback to full amount if no split data
    }

    const userSplit = receipt.splitCalculations.find(calc =>
        calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_')
    );

    return userSplit ? userSplit.total : receipt.total;
}

async function deleteSpecificVisit(receiptId: string, restaurantName: string, date: string): Promise<void> {
    const formattedDate = new Date(date).toLocaleDateString();
    const confirmed = confirm(
        `Are you sure you want to delete your visit to ${restaurantName} on ${formattedDate}?\n\n` +
        `This will permanently remove this receipt and cannot be undone.`
    );

    if (!confirmed) return;

    try {
        showLoading();
        await deleteReceipt(receiptId);
        showToast('Visit deleted successfully', 'success');

        // Refresh the visits display
        const updatedReceipts = await getReceipts();
        const restaurantReceipts = updatedReceipts.receipts.filter(
            receipt => receipt.restaurantName === restaurantName
        );

        if (restaurantReceipts.length === 0) {
            hideRestaurantVisits();
            showToast('No more visits for this restaurant', 'info');
        } else {
            displayRestaurantVisits(restaurantReceipts);
        }

        // Refresh restaurant history
        loadRestaurants();

    } catch (error) {
        showToast('Failed to delete visit', 'error');
    } finally {
        hideLoading();
    }
}

async function recalculateRestaurantTotals(): Promise<void> {
    if (!confirm('This will recalculate all restaurant totals based on your completed splits. This may take a moment. Continue?')) {
        return;
    }

    try {
        showLoading();
        const result = await apiCall<{success: boolean; updated: number; message: string}>('/receipts/restaurants/recalculate', {
            method: 'POST'
        });

        showToast(`Restaurant totals recalculated! Updated ${result.updated} restaurants.`, 'success');
        await loadRestaurants(); // Refresh the display
    } catch (error) {
        showToast('Failed to recalculate restaurant totals', 'error');
    } finally {
        hideLoading();
    }
}

async function exportRestaurantHistory(): Promise<void> {
    try {
        const result = await getRestaurants();
        const csvContent = 'Restaurant,Visits,Total Spent,Last Visit,Is Favorite\n' +
            result.restaurants.map(r =>
                `"${r.name}",${r.visitCount},$${r.totalSpent.toFixed(2)},${new Date(r.lastVisit).toLocaleDateString()},${r.isFavorite ? 'Yes' : 'No'}`
            ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restaurant_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Restaurant history exported successfully!', 'success');
    } catch (error) {
        showToast('Failed to export restaurant history', 'error');
    }
}

// Global functions for onclick handlers
(window as any).showDashboardTab = showDashboardTab;
(window as any).filterHistory = filterHistory;
(window as any).showRestaurantVisits = showRestaurantVisits;
(window as any).hideRestaurantVisits = hideRestaurantVisits;
(window as any).deleteSpecificVisit = deleteSpecificVisit;
(window as any).exportRestaurantHistory = exportRestaurantHistory;
(window as any).recalculateRestaurantTotals = recalculateRestaurantTotals;
(window as any).toggleFavorite = toggleFavorite;
(window as any).deleteRestaurantFromHistory = deleteRestaurantFromHistory;
(window as any).clearAllRestaurants = clearAllRestaurants;

function displayReceipts(receipts: Receipt[]): void {
    console.log('displayReceipts called with', receipts.length, 'receipts');
    if (receipts.length === 0) {
        elements.receiptsList.innerHTML = `
            <div class="empty-state">
                <p>No receipts yet. Upload your first receipt to get started!</p>
            </div>
        `;
        return;
    }

    elements.receiptsList.innerHTML = receipts.map(receipt => `
        <div class="receipt-card">
            <div class="receipt-header" onclick="showReceiptDetails('${receipt._id}')">
                <div class="receipt-restaurant">${receipt.restaurantName}</div>
                <div class="receipt-total">$${receipt.total?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="receipt-date">${new Date(receipt.date).toLocaleDateString()}</div>
            <div class="receipt-items">${receipt.items?.length || 0} items</div>
            <div class="receipt-actions">
                <button class="btn-secondary" onclick="showReceiptDetails('${receipt._id}')">View Details</button>
                <button class="btn-primary" onclick="openBillSplitting('${receipt._id}')">Split Bill</button>
            </div>
            <button class="delete-icon" onclick="confirmDeleteReceipt('${receipt._id}', '${receipt.restaurantName}', event)" title="Delete receipt">
                🗑️
            </button>
            ${receipt.people && receipt.people.length > 0 ? `
                <div class="receipt-status">
                    <span class="status-badge ${receipt.isComplete ? 'complete' : 'incomplete'}">
                        ${receipt.isComplete ? '✓ Split Complete' : '⚠ Split In Progress'}
                    </span>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function showReceiptDetails(receiptId: string): Promise<void> {
    console.log('showReceiptDetails called with ID:', receiptId);
    try {
        showLoading();
        const result = await getReceipt(receiptId);
        const receipt = result.receipt;

        elements.receiptDetails.innerHTML = `
            <h3>${receipt.restaurantName}</h3>
            <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString()}</p>
            <p><strong>Total:</strong> $${receipt.total?.toFixed(2) || '0.00'}</p>

            <h4>Items:</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${receipt.items?.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span>${item.name} (x${item.quantity})</span>
                        <span>$${item.price?.toFixed(2) || '0.00'}</span>
                    </div>
                `).join('') || '<p>No items found</p>'}
            </div>

            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #eee;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>$${receipt.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Tax:</span>
                    <span>$${receipt.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Tip:</span>
                    <span>$${receipt.tip?.toFixed(2) || '0.00'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem;">
                    <span>Total:</span>
                    <span>$${receipt.total?.toFixed(2) || '0.00'}</span>
                </div>
            </div>

            ${receipt.signedImageUrl ? `
                <div style="margin-top: 1rem;">
                    <img src="${receipt.signedImageUrl}" alt="Receipt" style="max-width: 100%; height: auto; border-radius: 5px;">
                </div>
            ` : ''}
        `;

        elements.receiptModal.classList.remove('hidden');
    } catch (error) {
        showToast('Failed to load receipt details', 'error');
    } finally {
        hideLoading();
    }
}

// Make function global for onclick handlers
(window as any).showReceiptDetails = showReceiptDetails;


// File Upload Visual Feedback - moved to DOMContentLoaded to prevent duplication

// Initialize App
function initApp(): void {
    // Check for stored user
    const storedUser = localStorage.getItem('splitbite_user');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            console.log('Loaded user from localStorage:', currentUser);
            updateNavigation();
            showSection('dashboard');
            loadDashboard();
        } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('splitbite_user');
            showSection('landing');
        }
    } else {
        console.log('No stored user found');
        showSection('landing');
    }

    updateNavigation();
}

// Split Modal Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Main navigation event handlers
    buttons.getStarted?.addEventListener('click', () => {
        showSection('signupSection');
    });

    buttons.login?.addEventListener('click', () => {
        showSection('loginSection');
    });

    buttons.signup?.addEventListener('click', () => {
        showSection('signupSection');
    });

    buttons.switchToSignup?.addEventListener('click', (e: Event) => {
        e.preventDefault();
        showSection('signupSection');
    });

    buttons.switchToLogin?.addEventListener('click', (e: Event) => {
        e.preventDefault();
        showSection('loginSection');
    });

    buttons.logout?.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('splitbite_user');
        updateNavigation();
        showSection('landing');
        showToast('Logged out successfully', 'success');
    });

    buttons.upload?.addEventListener('click', () => {
        // Reset the form and file input when opening upload section
        forms.upload?.reset();
        resetFileLabel();

        // Hide upload progress
        elements.uploadProgress?.classList.add('hidden');

        // Show upload section
        elements.uploadSection?.classList.remove('hidden');
    });

    buttons.cancelUpload?.addEventListener('click', () => {
        elements.uploadSection?.classList.add('hidden');
        forms.upload?.reset();
        resetFileLabel();

        // Hide upload progress if visible
        elements.uploadProgress?.classList.add('hidden');
    });

    // Form Handlers
    forms.signup?.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const nameInput = document.getElementById('signupName') as HTMLInputElement;
        const emailInput = document.getElementById('signupEmail') as HTMLInputElement;
        const passwordInput = document.getElementById('signupPassword') as HTMLInputElement;

        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            showLoading();
            const result = await signup(name, email, password);

            currentUser = {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                token: result.token,
                createdAt: result.user.createdAt
            };

            localStorage.setItem('splitbite_user', JSON.stringify(currentUser));
            updateNavigation();
            showSection('dashboard');
            loadDashboard();
            showToast('Account created successfully!', 'success');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            hideLoading();
        }
    });

    forms.login?.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const emailInput = document.getElementById('loginEmail') as HTMLInputElement;
        const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            showLoading();
            const result = await login(email, password);

            currentUser = {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                token: result.token,
                createdAt: result.user.createdAt
            };

            localStorage.setItem('splitbite_user', JSON.stringify(currentUser));
            updateNavigation();
            showSection('dashboard');
            loadDashboard();
            showToast('Logged in successfully!', 'success');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            hideLoading();
        }
    });

    forms.upload?.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Form submit triggered, isUploading:', isUploading);

        // Prevent double submissions
        if (isUploading) {
            console.log('Upload already in progress, ignoring');
            return;
        }

        const fileInput = document.getElementById('receiptFile') as HTMLInputElement;
        const file = fileInput.files?.[0];

        console.log('Form submitted, file:', file);

        if (!file) {
            showToast('Please select a file first', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Please select a PNG or JPG image', 'error');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showToast('File too large. Please select a file under 10MB', 'error');
            return;
        }

        try {
            isUploading = true;
            console.log('Starting upload for file:', file.name);
            elements.uploadProgress?.classList.remove('hidden');

            // Disable submit button to prevent multiple clicks
            const submitBtn = forms.upload?.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading...';
            }

            const result = await uploadReceipt(file);

            showToast('Receipt uploaded and processed successfully!', 'success');
            elements.uploadSection?.classList.add('hidden');

            // Reset form and file input
            forms.upload?.reset();
            resetFileLabel();

            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload & Process';
            }

            // Refresh the lists
            await loadReceipts();
            await loadRestaurants();
        } catch (error) {
            console.error('Upload error:', error);
            showToast((error as Error).message, 'error');

            // Re-enable submit button on error
            const submitBtn = forms.upload?.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload & Process';
            }
        } finally {
            isUploading = false;
            elements.uploadProgress?.classList.add('hidden');
        }
    });

    // People step event listeners
    const addPersonBtn = document.getElementById('addPersonBtn');
    const continueToItemsBtn = document.getElementById('continueToItemsBtn');
    const personNameInput = document.getElementById('personNameInput') as HTMLInputElement;
    const personEmailInput = document.getElementById('personEmailInput') as HTMLInputElement;

    addPersonBtn?.addEventListener('click', addPersonToSplit);
    continueToItemsBtn?.addEventListener('click', continueToItems);

    // Allow adding person with Enter key
    personNameInput?.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            addPersonToSplit();
        }
    });

    personEmailInput?.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            addPersonToSplit();
        }
    });

    // Items step event listeners
    const calculateSplitBtn = document.getElementById('calculateSplitBtn');
    calculateSplitBtn?.addEventListener('click', calculateSplit);

    // Results step event listeners
    const exportSummaryBtn = document.getElementById('exportSummaryBtn');
    const shareSplitBtn = document.getElementById('shareSplitBtn');
    const saveSplitBtn = document.getElementById('saveSplitBtn');

    exportSummaryBtn?.addEventListener('click', exportSummary);
    shareSplitBtn?.addEventListener('click', shareSplit);
    saveSplitBtn?.addEventListener('click', saveSplit);

    // Modal close handlers
    const closeSplitModalBtn = document.getElementById('closeSplitModal');
    const splitModal = document.getElementById('splitModal');

    closeSplitModalBtn?.addEventListener('click', closeSplitModal);

    splitModal?.addEventListener('click', (e: Event) => {
        if (e.target === splitModal) {
            closeSplitModal();
        }
    });

    // Receipt modal close handler
    const receiptModalClose = document.querySelector('.close');
    receiptModalClose?.addEventListener('click', () => {
        elements.receiptModal?.classList.add('hidden');
    });

    elements.receiptModal?.addEventListener('click', (e: Event) => {
        if (e.target === elements.receiptModal) {
            elements.receiptModal.classList.add('hidden');
        }
    });

    // File Upload Visual Feedback
    const receiptFileInput = document.getElementById('receiptFile') as HTMLInputElement;
    receiptFileInput?.addEventListener('change', (e: Event) => {
        const fileLabel = document.querySelector('.file-text') as HTMLElement;
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        console.log('File input changed, file:', file);

        if (file) {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) {
                fileLabel.textContent = '❌ Invalid file type - use PNG or JPG';
                fileLabel.style.color = '#dc3545';
                // Clear the invalid file
                target.value = '';
                return;
            }

            // Validate file size
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                fileLabel.textContent = '❌ File too large - max 10MB';
                fileLabel.style.color = '#dc3545';
                // Clear the invalid file
                target.value = '';
                return;
            }

            // File is valid
            fileLabel.textContent = `✅ Selected: ${file.name}`;
            fileLabel.style.color = '#28a745';
        } else {
            fileLabel.textContent = 'Choose receipt image (PNG, JPG)';
            fileLabel.style.color = '';
        }
    });

    // Initialize the app
    initApp();
});