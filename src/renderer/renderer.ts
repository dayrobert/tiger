const app = document.getElementById('app')

let currentItems: any[] = []
let sortColumn: 'name' | 'date' | null = null
let sortDirection: 'asc' | 'desc' = 'asc'

function updateStatusBar(connected: boolean) {
  const statusText = document.getElementById('ebayStatusText')
  if (statusText) {
    statusText.innerHTML = connected ? '<span class="status-check">✓</span> Connected' : 'Not connected'
  }
}

function sortItems(items: any[], column: 'name' | 'date', direction: 'asc' | 'desc') {
  return [...items].sort((a, b) => {
    let aVal, bVal
    
    if (column === 'name') {
      aVal = (a.title || '').toLowerCase()
      bVal = (b.title || '').toLowerCase()
    } else {
      aVal = a.purchase_date || ''
      bVal = b.purchase_date || ''
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

function renderItems(items: any[]) {
  if (!app) return
  
  if (items.length === 0) {
    app.innerHTML = `<div class="empty-state">No items yet. Use File → Add New Item to get started.</div>`
    return
  }
  
  const nameSort = sortColumn === 'name' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''
  const dateSort = sortColumn === 'date' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''
  
  const tableHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAll"></th>
            <th class="sortable" data-column="name" style="cursor: pointer;">Name${nameSort}</th>
            <th class="sortable" data-column="date" style="cursor: pointer;">Purchase Date${dateSort}</th>
            <th>Purchase Price</th>
            <th>Condition</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td><input type="checkbox" class="row-checkbox" data-id="${item.id}"></td>
              <td>${escapeHtml(item.title)}</td>
              <td>${item.purchase_date || '-'}</td>
              <td>${item.purchase_price ? '$' + Number(item.purchase_price).toFixed(2) : '-'}</td>
              <td>${item.condition || '-'}</td>
              <td><button class="details-btn" data-id="${item.id}">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
  
  app.innerHTML = tableHTML
  
  // Add event listeners
  const selectAll = document.getElementById('selectAll') as HTMLInputElement
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.row-checkbox') as NodeListOf<HTMLInputElement>
      checkboxes.forEach(cb => cb.checked = selectAll.checked)
    })
  }
  
  // Add sort listeners
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', (e) => {
      const column = (e.target as HTMLElement).getAttribute('data-column') as 'name' | 'date'
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        sortColumn = column
        sortDirection = 'asc'
      }
      const sortedItems = sortItems(currentItems, sortColumn, sortDirection)
      renderItems(sortedItems)
    })
  })
  
  // Add detail button listeners
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-id')
      showItemDetails(id)
    })
  })
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function loadItems() {
  if (!app) return
  
  try {
    window.electronAPI.log.debug('Loading items...')
    const result = await window.electronAPI.item.list()
    
    if (!result.success) {
      window.electronAPI.log.error('Failed to load items:', result.error)
      app.innerHTML = `<div class="empty-state">Error loading items: ${result.error}</div>`
      return
    }
    
    currentItems = result.items || []
    window.electronAPI.log.info(`Loaded ${currentItems.length} items`)
    renderItems(currentItems)
  } catch (error: any) {
    window.electronAPI.log.error('Exception loading items:', error)
    app.innerHTML = `<div class="empty-state">Error loading items: ${error.message}</div>`
  }
}

async function showItemDetails(id: string | null) {
  if (!id) return
  
  window.electronAPI.log.debug('Loading item details for ID:', id)
  const result = await window.electronAPI.item.get(parseInt(id))
  if (!result.success || !result.item) {
    window.electronAPI.log.error('Failed to load item:', result.error)
    alert('Failed to load item: ' + (result.error || 'Unknown error'))
    return
  }
  
  const item = result.item
  window.electronAPI.log.debug('Item loaded:', item.title)
  const dialog = document.getElementById('editItemDialog')
  if (!dialog) return
  
  // Populate form with item data
  const form = document.getElementById('editItemForm') as HTMLFormElement
  if (form) {
    (form.elements.namedItem('itemId') as HTMLInputElement).value = item.id
    ;(form.elements.namedItem('title') as HTMLInputElement).value = item.title || ''
    ;(form.elements.namedItem('description') as HTMLTextAreaElement).value = item.description || ''
    ;(form.elements.namedItem('purchasePrice') as HTMLInputElement).value = item.purchase_price || ''
    ;(form.elements.namedItem('purchaseDate') as HTMLInputElement).value = item.purchase_date || ''
    ;(form.elements.namedItem('condition') as HTMLSelectElement).value = item.condition || ''
    ;(form.elements.namedItem('shippingCost') as HTMLInputElement).value = item.shipping_cost || ''
    ;(form.elements.namedItem('notes') as HTMLTextAreaElement).value = item.notes || ''
  }
  
  dialog.style.display = 'flex'
}

function hideEditItemDialog() {
  const dialog = document.getElementById('editItemDialog')
  if (dialog) {
    dialog.style.display = 'none'
  }
}

async function showPreferences() {
  const dialog = document.getElementById('preferencesDialog')
  if (!dialog) return
  
  // Load current settings
  const result = await window.electronAPI.settings.get()
  if (result.success && result.settings) {
    const settings = result.settings
    const form = document.getElementById('preferencesForm') as HTMLFormElement
    if (form) {
      (form.elements.namedItem('dbHost') as HTMLInputElement).value = settings.database.host || ''
      ;(form.elements.namedItem('dbPort') as HTMLInputElement).value = settings.database.port || ''
      ;(form.elements.namedItem('dbUser') as HTMLInputElement).value = settings.database.user || ''
      ;(form.elements.namedItem('dbPassword') as HTMLInputElement).value = settings.database.password || ''
      ;(form.elements.namedItem('dbDatabase') as HTMLInputElement).value = settings.database.database || ''
      ;(form.elements.namedItem('ebayClientId') as HTMLInputElement).value = settings.ebay.clientId || ''
      ;(form.elements.namedItem('ebayClientSecret') as HTMLInputElement).value = settings.ebay.clientSecret || ''
      ;(form.elements.namedItem('ebayToken') as HTMLInputElement).value = settings.ebay.token || ''
    }
  }
  
  dialog.style.display = 'flex'
}

function hidePreferences() {
  const dialog = document.getElementById('preferencesDialog')
  if (dialog) {
    dialog.style.display = 'none'
  }
}

async function handlePreferencesSubmit(event: Event) {
  event.preventDefault()
  
  const form = event.target as HTMLFormElement
  const formData = new FormData(form)
  
  const settings = {
    database: {
      host: formData.get('dbHost') as string,
      port: parseInt(formData.get('dbPort') as string),
      user: formData.get('dbUser') as string,
      password: formData.get('dbPassword') as string,
      database: formData.get('dbDatabase') as string
    },
    ebay: {
      clientId: formData.get('ebayClientId') as string,
      clientSecret: formData.get('ebayClientSecret') as string,
      token: formData.get('ebayToken') as string
    }
  }
  
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Saving...'
  }
  
  try {
    const result = await window.electronAPI.settings.update(settings)
    
    if (result.success) {
      alert('Preferences saved successfully! Please restart the application for database changes to take full effect.')
      hidePreferences()
    } else {
      alert(`Error saving preferences: ${result.error}`)
    }
  } catch (error: any) {
    alert(`Error: ${error.message}`)
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Save Preferences'
    }
  }
}

async function handleEditItem(event: Event) {
  event.preventDefault()
  
  const form = event.target as HTMLFormElement
  const formData = new FormData(form)
  
  const itemId = parseInt(formData.get('itemId') as string)
  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    purchasePrice: formData.get('purchasePrice') ? parseFloat(formData.get('purchasePrice') as string) : undefined,
    purchaseDate: formData.get('purchaseDate') as string || undefined,
    condition: formData.get('condition') as string || undefined,
    shippingCost: formData.get('shippingCost') ? parseFloat(formData.get('shippingCost') as string) : undefined,
    notes: formData.get('notes') as string
  }
  
  window.electronAPI.log.info('Updating item:', itemId)
  
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Saving...'
  }
  
  try {
    const result = await window.electronAPI.item.update(itemId, data)
    
    if (result.success) {
      window.electronAPI.log.info('Item updated successfully')
      alert('Item updated successfully!')
      hideEditItemDialog()
      await loadItems()
    } else {
      window.electronAPI.log.error('Failed to update item:', result.error)
      alert(`Error updating item: ${result.error}`)
    }
  } catch (error: any) {
    window.electronAPI.log.error('Error updating item:', error)
    alert(`Error: ${error.message}`)
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Save Changes'
    }
  }
}

function showAddItemDialog() {
  const dialog = document.getElementById('addItemDialog')
  if (dialog) {
    dialog.style.display = 'flex'
  }
}

function hideAddItemDialog() {
  const dialog = document.getElementById('addItemDialog')
  if (dialog) {
    dialog.style.display = 'none'
    // Reset form
    const form = document.getElementById('addItemForm') as HTMLFormElement
    if (form) form.reset()
  }
}

async function handleAddItem(event: Event) {
  event.preventDefault()
  
  const form = event.target as HTMLFormElement
  const formData = new FormData(form)
  
  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    purchasePrice: formData.get('purchasePrice') ? parseFloat(formData.get('purchasePrice') as string) : undefined,
    purchaseDate: formData.get('purchaseDate') as string || undefined,
    condition: formData.get('condition') as string || undefined,
    shippingCost: formData.get('shippingCost') ? parseFloat(formData.get('shippingCost') as string) : undefined,
    notes: formData.get('notes') as string
  }
  
  window.electronAPI.log.info('Creating new item:', data.title)
  
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Saving...'
  }
  
  try {
    const result = await window.electronAPI.item.create(data)
    
    if (result.success) {
      window.electronAPI.log.info('Item created successfully with ID:', result.itemId)
      alert('Item added successfully!')
      hideAddItemDialog()
      // Refresh the table
      await loadItems()
    } else {
      window.electronAPI.log.error('Failed to create item:', result.error)
      alert(`Error adding item: ${result.error}`)
    }
  } catch (error: any) {
    window.electronAPI.log.error('Error creating item:', error)
    alert(`Error: ${error.message}`)
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Add Item'
    }
  }
}

async function initialize() {
  if (!app) return

  // Check if electronAPI is available
  if (typeof window.electronAPI === 'undefined') {
    app.innerHTML = `<div class="empty-state">Error: Electron API not loaded. Please restart the application.</div>`
    console.error('window.electronAPI is undefined - preload script may have failed to load')
    return
  }

  window.electronAPI.log.info('Initializing renderer...')

  // Check eBay connection status
  const status = await window.electronAPI.ebay.checkConnection()
  window.electronAPI.log.debug('eBay connection status:', status.connected)
  
  // Update status bar
  updateStatusBar(status.connected)
  
  // Load and display items
  await loadItems()
  
  // Add dialogs HTML
  const dialogHTML = `
    <!-- Add Item Dialog -->
    <div id="addItemDialog" class="modal">
      <div class="modal-content">
        <h2>Add New Item</h2>
        <form id="addItemForm">
          <div class="form-group">
            <label for="title">Item Name: *</label>
            <input type="text" id="title" name="title" required>
          </div>
          
          <div class="form-group">
            <label for="description">Description:</label>
            <textarea id="description" name="description" rows="3"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="purchasePrice">Purchase Price:</label>
              <input type="number" id="purchasePrice" name="purchasePrice" step="0.01" min="0">
            </div>
            
            <div class="form-group">
              <label for="shippingCost">Shipping Cost:</label>
              <input type="number" id="shippingCost" name="shippingCost" step="0.01" min="0" value="0">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="purchaseDate">Purchase Date:</label>
              <input type="date" id="purchaseDate" name="purchaseDate">
            </div>
            
            <div class="form-group">
              <label for="condition">Condition:</label>
              <select id="condition" name="condition">
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="bad">Bad</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="notes">Notes:</label>
            <textarea id="notes" name="notes" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit">Add Item</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Edit Item Dialog -->
    <div id="editItemDialog" class="modal">
      <div class="modal-content">
        <h2>Edit Item</h2>
        <form id="editItemForm">
          <input type="hidden" name="itemId">
          
          <div class="form-group">
            <label for="edit-title">Item Name: *</label>
            <input type="text" id="edit-title" name="title" required>
          </div>
          
          <div class="form-group">
            <label for="edit-description">Description:</label>
            <textarea id="edit-description" name="description" rows="3"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-purchasePrice">Purchase Price:</label>
              <input type="number" id="edit-purchasePrice" name="purchasePrice" step="0.01" min="0">
            </div>
            
            <div class="form-group">
              <label for="edit-shippingCost">Shipping Cost:</label>
              <input type="number" id="edit-shippingCost" name="shippingCost" step="0.01" min="0" value="0">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="edit-purchaseDate">Purchase Date:</label>
              <input type="date" id="edit-purchaseDate" name="purchaseDate">
            </div>
            
            <div class="form-group">
              <label for="edit-condition">Condition:</label>
              <select id="edit-condition" name="condition">
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="bad">Bad</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="edit-notes">Notes:</label>
            <textarea id="edit-notes" name="notes" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="editCancelBtn">Cancel</button>
            <button type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Preferences Dialog -->
    <div id="preferencesDialog" class="modal">
      <div class="modal-content" style="max-width: 700px;">
        <h2>Preferences</h2>
        <form id="preferencesForm">
          <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Database Connection</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="pref-db-host">Host:</label>
              <input type="text" id="pref-db-host" name="dbHost" required>
            </div>
            <div class="form-group" style="flex: 0 0 150px;">
              <label for="pref-db-port">Port:</label>
              <input type="number" id="pref-db-port" name="dbPort" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="pref-db-user">Username:</label>
              <input type="text" id="pref-db-user" name="dbUser" required>
            </div>
            <div class="form-group">
              <label for="pref-db-password">Password:</label>
              <input type="password" id="pref-db-password" name="dbPassword">
            </div>
          </div>
          
          <div class="form-group">
            <label for="pref-db-database">Database Name:</label>
            <input type="text" id="pref-db-database" name="dbDatabase" required>
          </div>
          
          <h3 style="margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">eBay API</h3>
          <div class="form-group">
            <label for="pref-ebay-client-id">Client ID:</label>
            <input type="text" id="pref-ebay-client-id" name="ebayClientId">
          </div>
          
          <div class="form-group">
            <label for="pref-ebay-client-secret">Client Secret:</label>
            <input type="password" id="pref-ebay-client-secret" name="ebayClientSecret">
          </div>
          
          <div class="form-group">
            <label for="pref-ebay-token">OAuth Token:</label>
            <input type="text" id="pref-ebay-token" name="ebayToken">
            <small style="color: #666;">Leave blank to use Connect to eBay feature</small>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="prefCancelBtn">Cancel</button>
            <button type="submit">Save Preferences</button>
          </div>
        </form>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', dialogHTML)

  const addItemForm = document.getElementById('addItemForm')
  const cancelBtn = document.getElementById('cancelBtn')
  const editItemForm = document.getElementById('editItemForm')
  const editCancelBtn = document.getElementById('editCancelBtn')
  const preferencesForm = document.getElementById('preferencesForm')
  const prefCancelBtn = document.getElementById('prefCancelBtn')
  
  // Handle eBay connection
  async function handleEbayConnect() {
    try {
      const result = await window.electronAPI.ebay.connect()
      
      if (result.success) {
        alert('Successfully connected to eBay!')
        // Update status bar
        updateStatusBar(true)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }
  
  if (addItemForm) {
    addItemForm.addEventListener('submit', handleAddItem)
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideAddItemDialog)
  }
  
  if (editItemForm) {
    editItemForm.addEventListener('submit', handleEditItem)
  }
  
  if (editCancelBtn) {
    editCancelBtn.addEventListener('click', hideEditItemDialog)
  }
  
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', handlePreferencesSubmit)
  }
  
  if (prefCancelBtn) {
    prefCancelBtn.addEventListener('click', hidePreferences)
  }
  
  // Listen for menu item triggers
  window.electronAPI.onShowAddItemDialog(showAddItemDialog)
  window.electronAPI.onConnectToEbay(handleEbayConnect)
  window.electronAPI.onShowPreferences(showPreferences)
}

initialize()
