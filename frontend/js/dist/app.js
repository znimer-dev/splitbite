"use strict";
const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
const sections = {
    landing: document.getElementById('landing'),
    loginSection: document.getElementById('loginSection'),
    signupSection: document.getElementById('signupSection'),
    dashboard: document.getElementById('dashboard')
};
const buttons = {
    login: document.getElementById('loginBtn'),
    signup: document.getElementById('signupBtn'),
    logout: document.getElementById('logoutBtn'),
    getStarted: document.getElementById('getStartedBtn'),
    upload: document.getElementById('uploadBtn'),
    switchToSignup: document.getElementById('switchToSignup'),
    switchToLogin: document.getElementById('switchToLogin'),
    cancelUpload: document.getElementById('cancelUpload')
};
const forms = {
    login: document.getElementById('loginForm'),
    signup: document.getElementById('signupForm'),
    upload: document.getElementById('uploadForm')
};
const elements = {
    userName: document.getElementById('userName'),
    uploadSection: document.getElementById('uploadSection'),
    receiptsList: document.getElementById('receiptsList'),
    uploadProgress: document.getElementById('uploadProgress'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    toast: document.getElementById('toast'),
    receiptModal: document.getElementById('receiptModal'),
    receiptDetails: document.getElementById('receiptDetails')
};
function showSection(sectionName) {
    Object.values(sections).forEach(section => section?.classList.add('hidden'));
    if (sections[sectionName]) {
        sections[sectionName].classList.remove('hidden');
    }
}
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}
function showLoading() {
    elements.loadingSpinner.classList.remove('hidden');
}
function hideLoading() {
    elements.loadingSpinner.classList.add('hidden');
}
function resetFileLabel() {
    const fileLabel = document.querySelector('.file-text');
    if (fileLabel) {
        fileLabel.textContent = 'Choose receipt image (PNG, JPG)';
        fileLabel.style.color = '';
    }
}
function updateNavigation() {
    if (currentUser) {
        buttons.login.classList.add('hidden');
        buttons.signup.classList.add('hidden');
        buttons.logout.classList.remove('hidden');
        elements.userName.textContent = currentUser.name;
    }
    else {
        buttons.login.classList.remove('hidden');
        buttons.signup.classList.remove('hidden');
        buttons.logout.classList.add('hidden');
    }
}
async function apiCall(endpoint, options = {}) {
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
        const data = await response.json();
        if (!response.ok) {
            const errorData = data;
            throw new Error(errorData.message || errorData.error || 'Request failed');
        }
        return data;
    }
    catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
async function signup(name, email, password) {
    return await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}
async function login(email, password) {
    return await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}
async function uploadReceipt(file) {
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
    const data = await response.json();
    if (!response.ok) {
        const errorData = data;
        throw new Error(errorData.message || errorData.error || 'Upload failed');
    }
    return data;
}
async function getReceipts() {
    return await apiCall('/receipts');
}
async function getReceipt(id) {
    return await apiCall(`/receipts/${id}`);
}
async function addPeopleToReceipt(receiptId, people) {
    return await apiCall(`/receipts/${receiptId}/people`, {
        method: 'POST',
        body: JSON.stringify({ people })
    });
}
async function assignItemToPeople(receiptId, itemIndex, assignedTo, notes) {
    return await apiCall(`/receipts/${receiptId}/items/${itemIndex}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo, notes })
    });
}
async function updateDistribution(receiptId, taxDistribution, tipDistribution) {
    return await apiCall(`/receipts/${receiptId}/distribution`, {
        method: 'PUT',
        body: JSON.stringify({ taxDistribution, tipDistribution })
    });
}
async function getSplitCalculation(receiptId) {
    return await apiCall(`/receipts/${receiptId}/split`);
}
async function getShareableSummary(receiptId) {
    return await apiCall(`/receipts/${receiptId}/summary`);
}
async function finalizeSplit(receiptId, userAmount) {
    console.log('finalizeSplit called with:', { receiptId, userAmount });
    console.log('Current user in finalizeSplit:', currentUser);
    return await apiCall(`/receipts/${receiptId}/finalize-split`, {
        method: 'PUT',
        body: JSON.stringify({ userAmount })
    });
}
async function getRestaurants() {
    return await apiCall('/receipts/restaurants');
}
async function deleteRestaurant(restaurantName) {
    return await apiCall(`/receipts/restaurants/${encodeURIComponent(restaurantName)}`, {
        method: 'DELETE'
    });
}
async function clearRestaurantHistory() {
    return await apiCall('/receipts/restaurants', {
        method: 'DELETE'
    });
}
async function toggleRestaurantFavorite(restaurantName) {
    return await apiCall(`/receipts/restaurants/${encodeURIComponent(restaurantName)}/favorite`, {
        method: 'PUT'
    });
}
async function deleteReceipt(receiptId) {
    return await apiCall(`/receipts/${receiptId}`, {
        method: 'DELETE'
    });
}
let isUploading = false;
let currentReceipt = null;
let currentSplitPeople = [];
let currentSplitCalculations = [];
function openBillSplitting(receiptId) {
    console.log('openBillSplitting called with ID:', receiptId);
    const splitModal = document.getElementById('splitModal');
    console.log('Split modal element:', splitModal);
    splitModal.classList.remove('hidden');
    console.log('Modal classes after removing hidden:', splitModal.className);
    showSplitStep('people');
    loadReceiptForSplitting(receiptId);
}
async function loadReceiptForSplitting(receiptId) {
    try {
        showLoading();
        const result = await getReceipt(receiptId);
        currentReceipt = result.receipt;
        const restaurantName = document.getElementById('splitRestaurantName');
        restaurantName.textContent = currentReceipt.restaurantName;
        if (!currentReceipt.people || currentReceipt.people.length === 0) {
            const defaultPerson = {
                id: `person_me_${Date.now()}`,
                name: 'Me',
                email: undefined,
                isRegisteredUser: true
            };
            currentSplitPeople = [defaultPerson];
            displaySplitPeople();
            const continueBtn = document.getElementById('continueToItemsBtn');
            continueBtn.disabled = false;
        }
        if (currentReceipt.people && currentReceipt.people.length > 0) {
            currentSplitPeople = [...currentReceipt.people];
            displaySplitPeople();
            const hasAssignments = currentReceipt.items.some(item => item.assignedTo && item.assignedTo.length > 0);
            if (hasAssignments) {
                const continueConfirm = confirm(`Split is already in progress for ${currentReceipt.restaurantName}. Would you like to continue where you left off?\n\nClick OK to continue, or Cancel to restart from the beginning.`);
                if (continueConfirm) {
                    showSplitStep('items');
                    setupSplitMethodHandlers();
                    setupItemsAssignment();
                    updateSplitMethodDisplay();
                    return;
                }
                else {
                    currentReceipt.items.forEach(item => {
                        item.assignedTo = [];
                    });
                }
            }
        }
    }
    catch (error) {
        showToast('Failed to load receipt for splitting', 'error');
    }
    finally {
        hideLoading();
    }
}
function showSplitStep(step) {
    const steps = ['people', 'items', 'results'];
    steps.forEach(s => {
        const stepElement = document.getElementById(`${s}Step`);
        stepElement.classList.add('hidden');
    });
    const activeStep = document.getElementById(`${step}Step`);
    activeStep.classList.remove('hidden');
}
function addPersonToSplit() {
    const nameInput = document.getElementById('personNameInput');
    const emailInput = document.getElementById('personEmailInput');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }
    if (currentSplitPeople.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('Person already added', 'error');
        return;
    }
    const person = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email: email || undefined,
        isRegisteredUser: false
    };
    currentSplitPeople.push(person);
    displaySplitPeople();
    nameInput.value = '';
    emailInput.value = '';
    nameInput.focus();
    const continueBtn = document.getElementById('continueToItemsBtn');
    continueBtn.disabled = currentSplitPeople.length === 0;
}
function displaySplitPeople() {
    const peopleList = document.getElementById('peopleList');
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
function removePersonFromSplit(index) {
    currentSplitPeople.splice(index, 1);
    displaySplitPeople();
    const continueBtn = document.getElementById('continueToItemsBtn');
    continueBtn.disabled = currentSplitPeople.length === 0;
}
async function continueToItems() {
    if (!currentReceipt || currentSplitPeople.length === 0) {
        showToast('Please add people first', 'error');
        return;
    }
    try {
        showLoading();
        await addPeopleToReceipt(currentReceipt._id, currentSplitPeople);
        currentReceipt.people = currentSplitPeople;
        showSplitStep('items');
        setupSplitMethodHandlers();
        setupItemsAssignment();
        updateSplitMethodDisplay();
    }
    catch (error) {
        showToast('Failed to save people', 'error');
    }
    finally {
        hideLoading();
    }
}
function setupSplitMethodHandlers() {
    const itemMethodRadio = document.getElementById('itemMethod');
    const percentageMethodRadio = document.getElementById('percentageMethod');
    itemMethodRadio?.addEventListener('change', updateSplitMethodDisplay);
    percentageMethodRadio?.addEventListener('change', updateSplitMethodDisplay);
}
function updateSplitMethodDisplay() {
    const itemMethod = document.getElementById('itemMethod');
    const itemsAssignment = document.getElementById('itemsAssignment');
    const percentageAssignment = document.getElementById('percentageAssignment');
    if (itemMethod?.checked) {
        itemsAssignment?.classList.remove('hidden');
        percentageAssignment?.classList.add('hidden');
        setupItemsAssignment();
    }
    else {
        itemsAssignment?.classList.add('hidden');
        percentageAssignment?.classList.remove('hidden');
        setupPercentageAssignment();
    }
}
function setupPercentageAssignment() {
    if (!currentReceipt || !currentSplitPeople.length)
        return;
    const percentageControls = document.getElementById('percentageControls');
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
            <div class="amount-value">$${(currentReceipt.total * equalPercentage / 100).toFixed(2)}</div>
        </div>
    `).join('');
    document.querySelectorAll('.percentage-slider').forEach(slider => {
        slider.addEventListener('input', updatePercentageDisplay);
    });
    updatePercentageDisplay();
}
function updatePercentageDisplay() {
    if (!currentReceipt)
        return;
    let totalPercentage = 0;
    const sliders = document.querySelectorAll('.percentage-slider');
    sliders.forEach(slider => {
        const percentage = parseInt(slider.value);
        totalPercentage += percentage;
        const control = slider.closest('.percentage-control');
        const percentageValue = control.querySelector('.percentage-value');
        const amountValue = control.querySelector('.amount-value');
        percentageValue.textContent = `${percentage}%`;
        amountValue.textContent = `$${(currentReceipt.total * percentage / 100).toFixed(2)}`;
    });
    const totalPercentageEl = document.getElementById('totalPercentage');
    const remainingAmountEl = document.getElementById('remainingAmount');
    totalPercentageEl.textContent = totalPercentage.toString();
    const remainingPercentage = 100 - totalPercentage;
    const remainingAmount = currentReceipt.total * remainingPercentage / 100;
    remainingAmountEl.textContent = remainingAmount.toFixed(2);
    const summary = document.querySelector('.percentage-summary');
    if (totalPercentage === 100) {
        summary.style.borderColor = '#28a745';
        remainingAmountEl.style.color = '#28a745';
    }
    else if (totalPercentage > 100) {
        summary.style.borderColor = '#dc3545';
        remainingAmountEl.style.color = '#dc3545';
    }
    else {
        summary.style.borderColor = '#ffc107';
        remainingAmountEl.style.color = '#ffc107';
    }
}
function setupItemsAssignment() {
    if (!currentReceipt)
        return;
    const itemsList = document.getElementById('itemsList');
    const peopleColumns = document.getElementById('peopleColumns');
    const unassignedItems = currentReceipt.items.filter(item => !item.assignedTo || item.assignedTo.length === 0);
    itemsList.innerHTML = unassignedItems.length > 0 ?
        unassignedItems.map((item, arrayIndex) => {
            const originalIndex = currentReceipt.items.findIndex(i => i.name === item.name && i.price === item.price && i.quantity === item.quantity);
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
    peopleColumns.innerHTML = currentSplitPeople.map(person => `
        <div class="person-column" data-person-id="${person.id}">
            <div class="person-column-header">
                <h4>${person.name}</h4>
                <div class="person-total">$0.00</div>
            </div>
            <div class="person-items" data-person-id="${person.id}">
                ${currentReceipt.items.filter(item => item.assignedTo && item.assignedTo.includes(person.id)).map((item, itemIndex) => {
        const originalIndex = currentReceipt.items.findIndex(i => i.name === item.name && i.price === item.price && i.quantity === item.quantity);
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
    setupDragAndDrop();
    updatePersonTotals();
}
function setupDragAndDrop() {
    console.log('Setting up drag and drop');
    const items = document.querySelectorAll('.item-card');
    console.log('Found', items.length, 'draggable items');
    items.forEach((item, index) => {
        const htmlItem = item;
        htmlItem.setAttribute('draggable', 'true');
        htmlItem.addEventListener('dragstart', handleDragStart);
        htmlItem.addEventListener('dragend', handleDragEnd);
        console.log('Added drag listeners to item', index);
    });
    const personColumns = document.querySelectorAll('.person-items');
    const personColumnContainers = document.querySelectorAll('.person-column');
    console.log('Found', personColumns.length, 'person drop zones');
    console.log('Found', personColumnContainers.length, 'person containers');
    [...personColumns, ...personColumnContainers].forEach((column, index) => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
        console.log('Added drop listeners to column', index);
    });
}
let draggedItem = null;
let draggedItemIndex = -1;
function handleDragStart(e) {
    const dragEvent = e;
    draggedItem = dragEvent.target;
    draggedItemIndex = parseInt(draggedItem.dataset.itemIndex || '-1');
    console.log('Drag started for item index:', draggedItemIndex);
    draggedItem.classList.add('dragging');
    if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', draggedItemIndex.toString());
    }
}
function handleDragEnd(e) {
    console.log('Drag ended');
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
        draggedItemIndex = -1;
    }
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dragEvent = e;
    if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget;
    target.classList.add('drag-over');
}
function handleDragLeave(e) {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const dragEvent = e;
    const x = dragEvent.clientX;
    const y = dragEvent.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        target.classList.remove('drag-over');
    }
}
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    console.log('Drop event triggered on:', target.className);
    if (draggedItemIndex === -1 || !currentReceipt) {
        console.log('No valid item being dragged');
        return;
    }
    let personId = target.dataset.personId;
    if (!personId) {
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
async function assignItemToPerson(itemIndex, personId) {
    if (!currentReceipt)
        return;
    try {
        const currentAssignments = currentReceipt.items[itemIndex].assignedTo || [];
        let newAssignments;
        if (currentAssignments.includes(personId)) {
            newAssignments = currentAssignments.filter(id => id !== personId);
        }
        else {
            newAssignments = [...currentAssignments, personId];
        }
        await assignItemToPeople(currentReceipt._id, itemIndex, newAssignments);
        currentReceipt.items[itemIndex].assignedTo = newAssignments;
        setupItemsAssignment();
    }
    catch (error) {
        showToast('Failed to assign item', 'error');
    }
}
function updatePersonTotals() {
    if (!currentReceipt)
        return;
    currentSplitPeople.forEach(person => {
        let total = 0;
        currentReceipt.items.forEach(item => {
            if (item.assignedTo && item.assignedTo.includes(person.id)) {
                total += (item.price * item.quantity) / item.assignedTo.length;
            }
        });
        const totalElement = document.querySelector(`[data-person-id="${person.id}"] .person-total`);
        if (totalElement) {
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    });
}
async function calculateSplit() {
    if (!currentReceipt)
        return;
    try {
        showLoading();
        const itemMethod = document.getElementById('itemMethod');
        const isItemBasedSplit = itemMethod?.checked;
        if (isItemBasedSplit) {
            const taxDistribution = document.getElementById('taxDistribution').value;
            const tipDistribution = document.getElementById('tipDistribution').value;
            await updateDistribution(currentReceipt._id, taxDistribution, tipDistribution);
            const result = await getSplitCalculation(currentReceipt._id);
            currentSplitCalculations = result.splits;
            showSplitStep('results');
            displaySplitResults(result.splits, result.stats, result.unassignedItems);
        }
        else {
            const percentageCalculations = calculatePercentageSplit();
            currentSplitCalculations = percentageCalculations;
            showSplitStep('results');
            displayPercentageResults(percentageCalculations);
        }
    }
    catch (error) {
        showToast('Failed to calculate split', 'error');
    }
    finally {
        hideLoading();
    }
}
function calculatePercentageSplit() {
    if (!currentReceipt)
        return [];
    const sliders = document.querySelectorAll('.percentage-slider');
    const calculations = [];
    sliders.forEach(slider => {
        const personId = slider.dataset.personId || '';
        const percentage = parseInt(slider.value);
        const person = currentSplitPeople.find(p => p.id === personId);
        if (person && percentage > 0) {
            const totalAmount = currentReceipt.total * (percentage / 100);
            const subtotalAmount = currentReceipt.subtotal * (percentage / 100);
            const taxAmount = currentReceipt.tax * (percentage / 100);
            const tipAmount = currentReceipt.tip * (percentage / 100);
            calculations.push({
                personId: person.id,
                name: person.name,
                subtotal: subtotalAmount,
                taxShare: taxAmount,
                tipShare: tipAmount,
                total: totalAmount,
                items: []
            });
        }
    });
    return calculations;
}
function displayPercentageResults(calculations) {
    const resultsContainer = document.getElementById('splitResults');
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
function displaySplitResults(splits, stats, unassignedItems) {
    const resultsContainer = document.getElementById('splitResults');
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
async function exportSummary() {
    if (!currentReceipt)
        return;
    try {
        const result = await getShareableSummary(currentReceipt._id);
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
    }
    catch (error) {
        showToast('Failed to export summary', 'error');
    }
}
async function shareSplit() {
    if (!currentReceipt)
        return;
    try {
        const result = await getShareableSummary(currentReceipt._id);
        if (navigator.share) {
            await navigator.share({
                title: `${currentReceipt.restaurantName} - Bill Split`,
                text: result.summary
            });
        }
        else {
            await navigator.clipboard.writeText(result.summary);
            showToast('Split summary copied to clipboard!', 'success');
        }
    }
    catch (error) {
        showToast('Failed to share split', 'error');
    }
}
async function saveSplit() {
    if (!currentReceipt) {
        showToast('No receipt data to save', 'error');
        return;
    }
    try {
        showLoading();
        let splitCalculations = currentSplitCalculations;
        if (!splitCalculations || splitCalculations.length === 0) {
            try {
                const splitResult = await getSplitCalculation(currentReceipt._id);
                if (!splitResult.success) {
                    showToast('Failed to calculate split before saving', 'error');
                    return;
                }
                splitCalculations = splitResult.splits;
            }
            catch (calcError) {
                console.error('Error calculating split:', calcError);
                showToast('Failed to calculate split', 'error');
                return;
            }
        }
        console.log('Split calculations:', splitCalculations);
        console.log('Current split people:', currentSplitPeople);
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
        console.log('Current user for finalize split:', currentUser);
        console.log('User ID being sent:', currentUser?.id);
        console.log('Token being sent:', currentUser?.token);
        await finalizeSplit(currentReceipt._id, userAmount);
        showToast(`Split saved successfully! Your amount: $${userAmount.toFixed(2)}`, 'success');
        const showSummary = confirm(`Split saved successfully! Your amount: $${userAmount.toFixed(2)}\n\n` +
            `Would you like to see the complete split summary before closing?`);
        if (showSummary) {
            await showCompletedSplitSummary(currentReceipt, splitCalculations, userAmount);
        }
        else {
            closeSplitModal();
        }
    }
    catch (error) {
        console.error('Error saving split:', error);
        showToast(`Failed to save split: ${error.message}`, 'error');
    }
    finally {
        hideLoading();
    }
}
async function showCompletedSplitSummary(receipt, splitCalculations, userAmount) {
    try {
        const result = await getShareableSummary(receipt._id);
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
    }
    catch (error) {
        console.error('Error showing split summary:', error);
        showToast('Could not load split summary', 'error');
        closeSplitModal();
    }
}
function closeSplitModal() {
    const splitModal = document.getElementById('splitModal');
    splitModal.classList.add('hidden');
    currentReceipt = null;
    currentSplitPeople = [];
    currentSplitCalculations = [];
    loadReceipts();
    loadRestaurants();
}
function unassignItem(itemIndex) {
    if (!currentReceipt)
        return;
    const item = currentReceipt.items[itemIndex];
    if (item) {
        item.assignedTo = [];
        setupItemsAssignment();
        showToast(`"${item.name}" has been unassigned`, 'success');
    }
}
window.removePersonFromSplit = removePersonFromSplit;
window.unassignItem = unassignItem;
window.confirmDeleteReceipt = async (receiptId, restaurantName, event) => {
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
            await loadReceipts();
        }
        catch (error) {
            showToast(`Failed to delete receipt: ${error.message}`, 'error');
        }
        finally {
            hideLoading();
        }
    }
};
window.openBillSplitting = openBillSplitting;
async function loadDashboard() {
    try {
        await loadReceipts();
        await loadRestaurants();
    }
    catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}
async function loadReceipts() {
    try {
        const result = await getReceipts();
        displayReceipts(result.receipts || []);
    }
    catch (error) {
        showToast('Failed to load receipts', 'error');
        displayReceipts([]);
    }
}
async function loadRestaurants() {
    try {
        console.log('loadRestaurants called');
        const result = await getRestaurants();
        console.log('Restaurants API result:', result);
        displayRestaurants(result.restaurants || []);
    }
    catch (error) {
        console.error('Error loading restaurants:', error);
        showToast('Failed to load restaurants', 'error');
        displayRestaurants([]);
    }
}
function displayRestaurants(restaurants) {
    console.log('displayRestaurants called with', restaurants.length, 'restaurants');
    console.log('Current filter:', currentHistoryFilter);
    const restaurantsList = document.getElementById('restaurantsList');
    if (!restaurantsList) {
        console.error('restaurantsList element not found');
        return;
    }
    const sortedRestaurants = [...restaurants].sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
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
async function toggleFavorite(restaurantName) {
    try {
        await toggleRestaurantFavorite(restaurantName);
        loadRestaurants();
        showToast('Favorite status updated', 'success');
    }
    catch (error) {
        showToast('Failed to update favorite', 'error');
    }
}
async function deleteRestaurantFromHistory(restaurantName) {
    if (!confirm(`Are you sure you want to delete "${restaurantName}" from your restaurant history? This cannot be undone.`)) {
        return;
    }
    try {
        showLoading();
        await deleteRestaurant(restaurantName);
        const restaurantVisitsSection = document.getElementById('restaurantVisits');
        const visitsRestaurantName = document.getElementById('visitsRestaurantName');
        if (restaurantVisitsSection && !restaurantVisitsSection.classList.contains('hidden') &&
            visitsRestaurantName && visitsRestaurantName.textContent?.includes(restaurantName)) {
            hideRestaurantVisits();
        }
        loadRestaurants();
        showToast(`"${restaurantName}" deleted from history`, 'success');
    }
    catch (error) {
        showToast('Failed to delete restaurant', 'error');
    }
    finally {
        hideLoading();
    }
}
async function clearAllRestaurants() {
    if (!confirm('Are you sure you want to clear ALL restaurant history? This cannot be undone.')) {
        return;
    }
    try {
        showLoading();
        const result = await clearRestaurantHistory();
        hideRestaurantVisits();
        loadRestaurants();
        showToast(result.message, 'success');
    }
    catch (error) {
        showToast('Failed to clear restaurant history', 'error');
    }
    finally {
        hideLoading();
    }
}
function showDashboardTab(tabName) {
    console.log('showDashboardTab called with:', tabName);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.getElementById(`${tabName}Tab`);
    console.log('Tab button found:', tabBtn);
    tabBtn?.classList.add('active');
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
    if (tabName === 'history') {
        console.log('Loading restaurants for history tab');
        loadRestaurants();
    }
    else if (tabName === 'receipts') {
        console.log('Loading receipts for receipts tab');
        loadReceipts();
    }
}
let currentHistoryFilter = 'all';
function filterHistory(filter) {
    currentHistoryFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const target = event?.target;
    target?.classList.add('active');
    loadRestaurants();
}
async function showRestaurantVisits(restaurantName) {
    try {
        showLoading();
        const receiptsResult = await getReceipts();
        const restaurantReceipts = receiptsResult.receipts.filter(receipt => receipt.restaurantName === restaurantName);
        if (restaurantReceipts.length === 0) {
            showToast('No visits found for this restaurant', 'info');
            return;
        }
        document.getElementById('restaurantVisits')?.classList.remove('hidden');
        document.getElementById('visitsRestaurantName').textContent = `${restaurantName} - Visits (${restaurantReceipts.length})`;
        displayRestaurantVisits(restaurantReceipts);
        document.getElementById('restaurantVisits')?.scrollIntoView({ behavior: 'smooth' });
    }
    catch (error) {
        showToast('Failed to load restaurant visits', 'error');
    }
    finally {
        hideLoading();
    }
}
function hideRestaurantVisits() {
    document.getElementById('restaurantVisits')?.classList.add('hidden');
}
function displayRestaurantVisits(receipts) {
    const visitsList = document.getElementById('visitsList');
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
        `$${receipt.total.toFixed(2)} (Full amount)`}
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
function calculateUserAmountFromReceipt(receipt) {
    if (!receipt.splitCalculations || receipt.splitCalculations.length === 0) {
        return receipt.total;
    }
    const userSplit = receipt.splitCalculations.find(calc => calc.name.toLowerCase() === 'me' || calc.personId.includes('person_me_'));
    return userSplit ? userSplit.total : receipt.total;
}
async function deleteSpecificVisit(receiptId, restaurantName, date) {
    const formattedDate = new Date(date).toLocaleDateString();
    const confirmed = confirm(`Are you sure you want to delete your visit to ${restaurantName} on ${formattedDate}?\n\n` +
        `This will permanently remove this receipt and cannot be undone.`);
    if (!confirmed)
        return;
    try {
        showLoading();
        await deleteReceipt(receiptId);
        showToast('Visit deleted successfully', 'success');
        const updatedReceipts = await getReceipts();
        const restaurantReceipts = updatedReceipts.receipts.filter(receipt => receipt.restaurantName === restaurantName);
        if (restaurantReceipts.length === 0) {
            hideRestaurantVisits();
            showToast('No more visits for this restaurant', 'info');
        }
        else {
            displayRestaurantVisits(restaurantReceipts);
        }
        loadRestaurants();
    }
    catch (error) {
        showToast('Failed to delete visit', 'error');
    }
    finally {
        hideLoading();
    }
}
async function recalculateRestaurantTotals() {
    if (!confirm('This will recalculate all restaurant totals based on your completed splits. This may take a moment. Continue?')) {
        return;
    }
    try {
        showLoading();
        const result = await apiCall('/receipts/restaurants/recalculate', {
            method: 'POST'
        });
        showToast(`Restaurant totals recalculated! Updated ${result.updated} restaurants.`, 'success');
        await loadRestaurants();
    }
    catch (error) {
        showToast('Failed to recalculate restaurant totals', 'error');
    }
    finally {
        hideLoading();
    }
}
async function exportRestaurantHistory() {
    try {
        const result = await getRestaurants();
        const csvContent = 'Restaurant,Visits,Total Spent,Last Visit,Is Favorite\n' +
            result.restaurants.map(r => `"${r.name}",${r.visitCount},$${r.totalSpent.toFixed(2)},${new Date(r.lastVisit).toLocaleDateString()},${r.isFavorite ? 'Yes' : 'No'}`).join('\n');
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
    }
    catch (error) {
        showToast('Failed to export restaurant history', 'error');
    }
}
window.showDashboardTab = showDashboardTab;
window.filterHistory = filterHistory;
window.showRestaurantVisits = showRestaurantVisits;
window.hideRestaurantVisits = hideRestaurantVisits;
window.deleteSpecificVisit = deleteSpecificVisit;
window.exportRestaurantHistory = exportRestaurantHistory;
window.recalculateRestaurantTotals = recalculateRestaurantTotals;
window.toggleFavorite = toggleFavorite;
window.deleteRestaurantFromHistory = deleteRestaurantFromHistory;
window.clearAllRestaurants = clearAllRestaurants;
function displayReceipts(receipts) {
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
async function showReceiptDetails(receiptId) {
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
    }
    catch (error) {
        showToast('Failed to load receipt details', 'error');
    }
    finally {
        hideLoading();
    }
}
window.showReceiptDetails = showReceiptDetails;
function initApp() {
    const storedUser = localStorage.getItem('splitbite_user');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            console.log('Loaded user from localStorage:', currentUser);
            updateNavigation();
            showSection('dashboard');
            loadDashboard();
        }
        catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('splitbite_user');
            showSection('landing');
        }
    }
    else {
        console.log('No stored user found');
        showSection('landing');
    }
    updateNavigation();
}
document.addEventListener('DOMContentLoaded', () => {
    buttons.getStarted?.addEventListener('click', () => {
        showSection('signupSection');
    });
    buttons.login?.addEventListener('click', () => {
        showSection('loginSection');
    });
    buttons.signup?.addEventListener('click', () => {
        showSection('signupSection');
    });
    buttons.switchToSignup?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('signupSection');
    });
    buttons.switchToLogin?.addEventListener('click', (e) => {
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
        forms.upload?.reset();
        resetFileLabel();
        elements.uploadProgress?.classList.add('hidden');
        elements.uploadSection?.classList.remove('hidden');
    });
    buttons.cancelUpload?.addEventListener('click', () => {
        elements.uploadSection?.classList.add('hidden');
        forms.upload?.reset();
        resetFileLabel();
        elements.uploadProgress?.classList.add('hidden');
    });
    forms.signup?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
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
        }
        catch (error) {
            showToast(error.message, 'error');
        }
        finally {
            hideLoading();
        }
    });
    forms.login?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
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
        }
        catch (error) {
            showToast(error.message, 'error');
        }
        finally {
            hideLoading();
        }
    });
    forms.upload?.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Form submit triggered, isUploading:', isUploading);
        if (isUploading) {
            console.log('Upload already in progress, ignoring');
            return;
        }
        const fileInput = document.getElementById('receiptFile');
        const file = fileInput.files?.[0];
        console.log('Form submitted, file:', file);
        if (!file) {
            showToast('Please select a file first', 'error');
            return;
        }
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Please select a PNG or JPG image', 'error');
            return;
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('File too large. Please select a file under 10MB', 'error');
            return;
        }
        try {
            isUploading = true;
            console.log('Starting upload for file:', file.name);
            elements.uploadProgress?.classList.remove('hidden');
            const submitBtn = forms.upload?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading...';
            }
            const result = await uploadReceipt(file);
            showToast('Receipt uploaded and processed successfully!', 'success');
            elements.uploadSection?.classList.add('hidden');
            forms.upload?.reset();
            resetFileLabel();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload & Process';
            }
            await loadReceipts();
            await loadRestaurants();
        }
        catch (error) {
            console.error('Upload error:', error);
            showToast(error.message, 'error');
            const submitBtn = forms.upload?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload & Process';
            }
        }
        finally {
            isUploading = false;
            elements.uploadProgress?.classList.add('hidden');
        }
    });
    const addPersonBtn = document.getElementById('addPersonBtn');
    const continueToItemsBtn = document.getElementById('continueToItemsBtn');
    const personNameInput = document.getElementById('personNameInput');
    const personEmailInput = document.getElementById('personEmailInput');
    addPersonBtn?.addEventListener('click', addPersonToSplit);
    continueToItemsBtn?.addEventListener('click', continueToItems);
    personNameInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPersonToSplit();
        }
    });
    personEmailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPersonToSplit();
        }
    });
    const calculateSplitBtn = document.getElementById('calculateSplitBtn');
    calculateSplitBtn?.addEventListener('click', calculateSplit);
    const exportSummaryBtn = document.getElementById('exportSummaryBtn');
    const shareSplitBtn = document.getElementById('shareSplitBtn');
    const saveSplitBtn = document.getElementById('saveSplitBtn');
    exportSummaryBtn?.addEventListener('click', exportSummary);
    shareSplitBtn?.addEventListener('click', shareSplit);
    saveSplitBtn?.addEventListener('click', saveSplit);
    const closeSplitModalBtn = document.getElementById('closeSplitModal');
    const splitModal = document.getElementById('splitModal');
    closeSplitModalBtn?.addEventListener('click', closeSplitModal);
    splitModal?.addEventListener('click', (e) => {
        if (e.target === splitModal) {
            closeSplitModal();
        }
    });
    const receiptModalClose = document.querySelector('.close');
    receiptModalClose?.addEventListener('click', () => {
        elements.receiptModal?.classList.add('hidden');
    });
    elements.receiptModal?.addEventListener('click', (e) => {
        if (e.target === elements.receiptModal) {
            elements.receiptModal.classList.add('hidden');
        }
    });
    const receiptFileInput = document.getElementById('receiptFile');
    receiptFileInput?.addEventListener('change', (e) => {
        const fileLabel = document.querySelector('.file-text');
        const target = e.target;
        const file = target.files?.[0];
        console.log('File input changed, file:', file);
        if (file) {
            const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
            if (!allowedTypes.includes(file.type)) {
                fileLabel.textContent = '❌ Invalid file type - use PNG or JPG';
                fileLabel.style.color = '#dc3545';
                target.value = '';
                return;
            }
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                fileLabel.textContent = '❌ File too large - max 10MB';
                fileLabel.style.color = '#dc3545';
                target.value = '';
                return;
            }
            fileLabel.textContent = `✅ Selected: ${file.name}`;
            fileLabel.style.color = '#28a745';
        }
        else {
            fileLabel.textContent = 'Choose receipt image (PNG, JPG)';
            fileLabel.style.color = '';
        }
    });
    initApp();
});
