/**
 * Magic Cover Custom Element
 * ============================================================================
 * Multi-instance safe, theme editor safe
 * All state stored on instance, all queries scoped to this element
 * 
 * EVENT CONTRACT (CustomEvents dispatched on this element):
 * ============================================================================
 * mc:form-revealed     - Form is shown to user
 * mc:photo-selected    - Photo file selected { detail: { category, index, file, preview } }
 * mc:cover-generating  - Cover generation started { detail: { characters, pets, items, theme } }
 * mc:cover-ready       - Cover generated { detail: { imageUrl } }
 * mc:package-selected  - Package radio changed { detail: { package, price } }
 * mc:currency-changed  - Currency switched { detail: { symbol, code } }
 * mc:order-submitting  - Order submission started { detail: { formData } }
 * mc:order-success     - Order completed successfully
 * mc:modal-closed      - Success modal dismissed
 * ============================================================================
 */

class MagicCover extends HTMLElement {
  // Currency mapping - static since it's constant
  static CURRENCY_MAP = {
    US: { symbol: '$', code: 'usd' },
    CA: { symbol: 'C$', code: 'cad' },
    GB: { symbol: '£', code: 'gbp' },
    AU: { symbol: 'A$', code: 'aud' },
    DE: { symbol: '€', code: 'eur' },
    FR: { symbol: '€', code: 'eur' },
    ES: { symbol: '€', code: 'eur' },
    IT: { symbol: '€', code: 'eur' },
    NL: { symbol: '€', code: 'eur' },
    BE: { symbol: '€', code: 'eur' },
    AT: { symbol: '€', code: 'eur' },
    IE: { symbol: '€', code: 'eur' },
    NZ: { symbol: 'NZ$', code: 'aud' },
    SG: { symbol: 'S$', code: 'usd' },
    AE: { symbol: '$', code: 'usd' },
    JP: { symbol: '¥', code: 'usd' }
  };

  // Event names as static constants for type safety
  static Events = {
    FORM_REVEALED: 'mc:form-revealed',
    PHOTO_SELECTED: 'mc:photo-selected',
    COVER_GENERATING: 'mc:cover-generating',
    COVER_READY: 'mc:cover-ready',
    STORY_CREATION_STARTED: 'mc:story-creation-started',
    PACKAGE_SELECTED: 'mc:package-selected',
    CURRENCY_CHANGED: 'mc:currency-changed',
    ORDER_SUBMITTING: 'mc:order-submitting',
    ORDER_SUCCESS: 'mc:order-success',
    MODAL_CLOSED: 'mc:modal-closed'
  };

  constructor() {
    super();
    // Instance state
    this.currentCurrency = { symbol: '$', code: 'usd' };
    this.sectionId = null;
    this.isGenerating = false;
    this.isSubmitting = false;
    
    // Photo data storage by category (simplified - no extra characters)
    this.photoData = {
      main: {},     // { 1: { file, preview }, 2: {...} }
      pet: {},      // { 1: {...}, 2: {...} }
      item: {}      // { 1: {...}, 2: {...}, 3: {...} }
    };
    
    // Bound event handlers for cleanup
    this._onMagicBtnClick = this._onMagicBtnClick.bind(this);
    this._onAccordionClick = this._onAccordionClick.bind(this);
    this._onPhotoChange = this._onPhotoChange.bind(this);
    this._onCharacterNameChange = this._onCharacterNameChange.bind(this);
    this._onMainHeroAgeChange = this._onMainHeroAgeChange.bind(this);
    this._onGenerateClick = this._onGenerateClick.bind(this);
    this._onCountryChange = this._onCountryChange.bind(this);
    this._onPackageChange = this._onPackageChange.bind(this);
    this._onFormSubmit = this._onFormSubmit.bind(this);
    this._onModalClose = this._onModalClose.bind(this);
    this._onCreateStoryClick = this._onCreateStoryClick.bind(this);
  }

  connectedCallback() {
    // Read configuration from data attributes
    this.sectionId = this.dataset.sectionId;
    
    // Cache DOM references (scoped to this element)
    this._cacheElements();
    
    // Detect and set initial currency
    this.currentCurrency = this._detectCurrency();
    
    // Bind event listeners
    this._bindEvents();
    
    // Initialize prices
    this._updatePrices();
    
    // Initialize counters
    this._updateAllCounters();
  }

  disconnectedCallback() {
    // Remove all event listeners for proper cleanup
    this._unbindEvents();
  }

  // ============================================
  // PUBLIC: Event Dispatch Helper
  // ============================================
  _emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: { sectionId: this.sectionId, ...detail }
    }));
  }

  // ============================================
  // PRIVATE: DOM CACHING
  // ============================================
  _cacheElements() {
    const id = this.sectionId;
    
    // Magic cover generator elements
    this.magicBtn = this.querySelector(`#magicBtn-${id}`);
    this.magicForm = this.querySelector(`#magicForm-${id}`);
    this.generateCoverBtn = this.querySelector(`#generateCoverBtn-${id}`);
    this.generateStatus = this.querySelector(`#generateStatus-${id}`);
    this.coverResult = this.querySelector(`#coverResult-${id}`);
    this.generatedCover = this.querySelector(`#generatedCover-${id}`);
    this.packSection = this.querySelector(`#packSection-${id}`);
    
    // Accordion headers
    this.accordionHeaders = this.querySelectorAll('.mc-accordion__header');
    
    // Photo inputs (all categories)
    this.photoInputs = this.querySelectorAll('input[type="file"][data-category]');
    
    // Counter badges
    this.mainCharCount = this.querySelector(`#mainCharCount-${id}`);
    this.petCount = this.querySelector(`#petCount-${id}`);
    this.itemCount = this.querySelector(`#itemCount-${id}`);
    
    // Theme selector
    this.themeSelect = this.querySelector(`#storyTheme-${id}`);
    
    // Order form elements
    this.countrySelect = this.querySelector(`#countrySelect-${id}`);
    this.orderForm = this.querySelector(`#orderForm-${id}`);
    this.submitBtn = this.querySelector(`#submitBtn-${id}`);
    this.successModal = this.querySelector(`#successModal-${id}`);
    this.modalCloseBtn = this.successModal?.querySelector('.modal-btn');
    
    // Story creation button
    this.createStoryBtn = this.querySelector(`#createStoryBtn-${id}`);
  }

  // ============================================
  // PRIVATE: EVENT BINDING
  // ============================================
  _bindEvents() {
    // Magic button click
    this.magicBtn?.addEventListener('click', this._onMagicBtnClick);
    
    // Accordion toggle
    this.accordionHeaders.forEach(header => {
      header.addEventListener('click', this._onAccordionClick);
    });
    
    // Photo inputs change
    this.photoInputs.forEach(input => {
      input.addEventListener('change', this._onPhotoChange);
    });
    
    // Character name inputs - to update owner dropdowns
    this.characterNameInputs = this.querySelectorAll('.mc-photo-card__name[data-category="main"]');
    this.characterNameInputs.forEach(input => {
      input.addEventListener('input', this._onCharacterNameChange);
    });
    
    // Main hero age selects - to auto-collapse when complete
    this.mainHeroAgeSelects = this.querySelectorAll('.mc-photo-card__age[data-category="main"]');
    this.mainHeroAgeSelects.forEach(select => {
      select.addEventListener('change', this._onMainHeroAgeChange);
    });
    
    // Generate button click
    this.generateCoverBtn?.addEventListener('click', this._onGenerateClick);
    
    // Create Story button click
    this.createStoryBtn?.addEventListener('click', this._onCreateStoryClick);
    
    // Country select change
    this.countrySelect?.addEventListener('change', this._onCountryChange);
    
    // Package radio buttons
    this.querySelectorAll('input[name="package"]').forEach(input => {
      input.addEventListener('change', this._onPackageChange);
    });
    
    // Order form submit
    this.orderForm?.addEventListener('submit', this._onFormSubmit);
    
    // Modal close button
    this.modalCloseBtn?.addEventListener('click', this._onModalClose);
  }

  _unbindEvents() {
    this.magicBtn?.removeEventListener('click', this._onMagicBtnClick);
    
    this.accordionHeaders.forEach(header => {
      header.removeEventListener('click', this._onAccordionClick);
    });
    
    this.photoInputs.forEach(input => {
      input.removeEventListener('change', this._onPhotoChange);
    });
    
    this.characterNameInputs?.forEach(input => {
      input.removeEventListener('input', this._onCharacterNameChange);
    });
    
    this.mainHeroAgeSelects?.forEach(select => {
      select.removeEventListener('change', this._onMainHeroAgeChange);
    });
    
    this.generateCoverBtn?.removeEventListener('click', this._onGenerateClick);
    this.createStoryBtn?.removeEventListener('click', this._onCreateStoryClick);
    this.countrySelect?.removeEventListener('change', this._onCountryChange);
    
    this.querySelectorAll('input[name="package"]').forEach(input => {
      input.removeEventListener('change', this._onPackageChange);
    });
    
    this.orderForm?.removeEventListener('submit', this._onFormSubmit);
    this.modalCloseBtn?.removeEventListener('click', this._onModalClose);
  }
  
  // ============================================
  // PRIVATE: CHARACTER NAME CHANGE - Update Owner Dropdowns
  // ============================================
  _onCharacterNameChange() {
    // Debounce the update
    clearTimeout(this._nameChangeTimeout);
    this._nameChangeTimeout = setTimeout(() => {
      this._updateAllOwnerDropdowns();
      this._updateMainCharSummary();
    }, 300);
  }
  
  // ============================================
  // PRIVATE: MAIN HERO AUTO-COLLAPSE (triggers on age selection)
  // ============================================
  _onMainHeroAgeChange(e) {
    const select = e.target;
    const index = select.dataset.index;
    const id = this.sectionId;
    
    // Check if this hero is complete (has photo, name, and age)
    const hasPhoto = this.photoData.main[index] != null;
    const nameInput = this.querySelector(`#mainCharName${index}-${id}`);
    const name = nameInput?.value?.trim();
    const age = select.value;
    
    if (hasPhoto && name && age) {
      // Update summary first
      this._updateMainCharSummary();
      
      // Auto-collapse the main characters accordion
      this._collapseMainCharAccordion();
    }
  }
  
  _collapseMainCharAccordion() {
    const accordion = this.querySelector('[data-accordion="main-characters"]');
    const header = accordion?.querySelector('.mc-accordion__header');
    const content = accordion?.querySelector('.mc-accordion__content');
    
    if (header?.getAttribute('aria-expanded') === 'true') {
      header.setAttribute('aria-expanded', 'false');
      content?.classList.add('mc-accordion__content--collapsed');
      
      // Update summary
      this._updateMainCharSummary();
    }
  }
  
  _updateMainCharSummary() {
    const id = this.sectionId;
    const summaryEl = this.querySelector(`#mainCharSummary-${id}`);
    if (!summaryEl) return;
    
    const mainChars = [];
    
    // Check hero 1
    if (this.photoData.main['1']) {
      const name = this.querySelector(`#mainCharName1-${id}`)?.value?.trim();
      if (name) mainChars.push(name);
    }
    
    // Check hero 2
    if (this.photoData.main['2']) {
      const name = this.querySelector(`#mainCharName2-${id}`)?.value?.trim();
      if (name) mainChars.push(name);
    }
    
    if (mainChars.length > 0) {
      const names = mainChars.join(' & ');
      const addMore = mainChars.length < 2 ? '<span class="mc-accordion__summary-add">• Add another?</span>' : '';
      summaryEl.innerHTML = `✓ ${names} ${addMore}`;
      summaryEl.classList.remove('hidden');
    } else {
      summaryEl.classList.add('hidden');
    }
  }
  
  _getCharacterList() {
    // Build list of main characters with photos (for owner dropdowns)
    const characters = [];
    const id = this.sectionId;
    
    // Main characters only
    for (let i = 1; i <= 2; i++) {
      if (this.photoData.main[i]) {
        const nameInput = this.querySelector(`#mainCharName${i}-${id}`);
        const name = nameInput?.value?.trim() || `Hero ${i}`;
        characters.push({
          id: `main-${i}`,
          name: name,
          type: 'main'
        });
      }
    }
    
    return characters;
  }
  
  _updateAllOwnerDropdowns() {
    const characters = this._getCharacterList();
    const id = this.sectionId;
    
    // Update pet owner dropdowns
    for (let i = 1; i <= 2; i++) {
      const dropdown = this.querySelector(`#petOwner${i}-${id}`);
      if (dropdown) {
        this._populateOwnerDropdown(dropdown, characters);
      }
    }
    
    // Update item owner dropdowns
    for (let i = 1; i <= 3; i++) {
      const dropdown = this.querySelector(`#itemOwner${i}-${id}`);
      if (dropdown) {
        this._populateOwnerDropdown(dropdown, characters);
      }
    }
  }
  
  _populateOwnerDropdown(dropdown, characters) {
    const currentValue = dropdown.value;
    
    // Clear existing options except "Everyone"
    dropdown.innerHTML = '<option value="everyone">👥 Everyone</option>';
    
    // Add main character options
    characters.forEach(char => {
      const option = document.createElement('option');
      option.value = char.id;
      option.textContent = `⭐ ${char.name}`;
      dropdown.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
      dropdown.value = currentValue;
    } else {
      dropdown.value = 'everyone';
    }
  }

  // ============================================
  // PRIVATE: ACCORDION HANDLING
  // ============================================
  _onAccordionClick(e) {
    const header = e.currentTarget;
    const accordion = header.closest('.mc-accordion');
    const content = accordion?.querySelector('.mc-accordion__content');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    
    // Toggle state
    header.setAttribute('aria-expanded', !isExpanded);
    
    if (content) {
      if (isExpanded) {
        content.classList.add('mc-accordion__content--collapsed');
      } else {
        content.classList.remove('mc-accordion__content--collapsed');
      }
    }
  }

  // ============================================
  // PRIVATE: PHOTO HANDLING
  // ============================================
  _onPhotoChange(e) {
    const input = e.target;
    const category = input.dataset.category;
    const index = input.dataset.index;
    
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Maximum 5MB allowed.');
      input.value = '';
      return;
    }
    
    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const preview = readerEvent.target.result;
      
      // Store photo data
      this.photoData[category][index] = {
        file: file,
        preview: preview,
        name: '',
        age: ''
      };
      
      // Update the card UI
      this._updatePhotoCard(category, index, preview);
      
      // Update counter
      this._updateCounter(category);
      
      // Dispatch event
      this._emit(MagicCover.Events.PHOTO_SELECTED, {
        category,
        index,
        file: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  }
  
  _updatePhotoCard(category, index, preview) {
    const id = this.sectionId;
    let previewEl, card, nameInput, ageSelect, fieldsContainer;
    
    switch (category) {
      case 'main':
        previewEl = this.querySelector(`#mainCharPreview${index}-${id}`);
        card = this.querySelector(`#mainChar${index}-${id}`);
        nameInput = this.querySelector(`#mainCharName${index}-${id}`);
        ageSelect = this.querySelector(`#mainCharAge${index}-${id}`);
        break;
      case 'pet':
        previewEl = this.querySelector(`#petPreview${index}-${id}`);
        card = this.querySelector(`#pet${index}-${id}`);
        fieldsContainer = this.querySelector(`#petFields${index}-${id}`);
        break;
      case 'item':
        previewEl = this.querySelector(`#itemPreview${index}-${id}`);
        card = this.querySelector(`#item${index}-${id}`);
        fieldsContainer = this.querySelector(`#itemFields${index}-${id}`);
        break;
    }
    
    if (previewEl) {
      previewEl.innerHTML = `
        <img src="${preview}" alt="Uploaded photo">
        <button type="button" class="mc-photo-card__remove" data-category="${category}" data-index="${index}" aria-label="Remove photo">×</button>
      `;
      
      // Add remove handler
      const removeBtn = previewEl.querySelector('.mc-photo-card__remove');
      removeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._removePhoto(category, index);
      });
    }
    
    if (card) {
      card.classList.add('mc-photo-card--filled');
      card.classList.remove('mc-photo-card--add');
    }
    
    // For main characters: show name/age inputs directly
    if (category === 'main') {
      if (nameInput) nameInput.classList.remove('hidden');
      if (ageSelect) ageSelect.classList.remove('hidden');
      // Update owner dropdowns for pets/items
      this._updateAllOwnerDropdowns();
      // Update summary
      this._updateMainCharSummary();
    }
    
    // For pets/items: show the fields container
    if (fieldsContainer) {
      fieldsContainer.classList.remove('hidden');
      this._updateAllOwnerDropdowns();
    }
    
    // Update card label
    const label = card?.querySelector('.mc-photo-card__label');
    if (label) {
      if (category === 'main') {
        label.textContent = index === '1' ? 'Hero 1 ✓' : 'Co-Hero ✓';
      } else if (category === 'pet') {
        label.textContent = 'Pet ✓';
      } else if (category === 'item') {
        label.textContent = 'Item ✓';
      }
    }
  }
  
  _removePhoto(category, index) {
    const id = this.sectionId;
    
    // Clear stored data
    delete this.photoData[category][index];
    
    // Reset the file input
    let input, previewEl, card, nameInput, ageSelect, fieldsContainer;
    
    switch (category) {
      case 'main':
        input = this.querySelector(`#mainCharPhoto${index}-${id}`);
        previewEl = this.querySelector(`#mainCharPreview${index}-${id}`);
        card = this.querySelector(`#mainChar${index}-${id}`);
        nameInput = this.querySelector(`#mainCharName${index}-${id}`);
        ageSelect = this.querySelector(`#mainCharAge${index}-${id}`);
        break;
      case 'pet':
        input = this.querySelector(`#petPhoto${index}-${id}`);
        previewEl = this.querySelector(`#petPreview${index}-${id}`);
        card = this.querySelector(`#pet${index}-${id}`);
        fieldsContainer = this.querySelector(`#petFields${index}-${id}`);
        break;
      case 'item':
        input = this.querySelector(`#itemPhoto${index}-${id}`);
        previewEl = this.querySelector(`#itemPreview${index}-${id}`);
        card = this.querySelector(`#item${index}-${id}`);
        fieldsContainer = this.querySelector(`#itemFields${index}-${id}`);
        break;
    }
    
    if (input) input.value = '';
    
    if (previewEl) {
      const placeholder = category === 'main' && index === '1' ? '📷' : 
                         category === 'pet' ? '🐾' :
                         category === 'item' ? '✨' : '➕';
      previewEl.innerHTML = `<span class="mc-photo-card__placeholder">${placeholder}</span>`;
    }
    
    if (card) {
      card.classList.remove('mc-photo-card--filled');
      if (category !== 'main' || index !== '1') {
        card.classList.add('mc-photo-card--add');
      }
    }
    
    // Hide name/age inputs for main characters (except for main hero 1 name)
    if (category === 'main') {
      if (nameInput && index !== '1') {
        nameInput.classList.add('hidden');
        nameInput.value = '';
      }
      if (ageSelect) {
        ageSelect.classList.add('hidden');
        ageSelect.value = '';
      }
    }
    
    // Hide fields container for pets/items and reset values
    if (fieldsContainer) {
      fieldsContainer.classList.add('hidden');
      const nameInput = fieldsContainer.querySelector('.mc-photo-card__name');
      const ownerSelect = fieldsContainer.querySelector('.mc-photo-card__owner');
      
      if (nameInput) nameInput.value = '';
      if (ownerSelect) ownerSelect.value = 'everyone';
    }
    
    // Reset card label
    const label = card?.querySelector('.mc-photo-card__label');
    if (label) {
      if (category === 'main') {
        label.textContent = index === '1' ? 'Hero 1 *' : 'Add Twin/Co-Hero';
      } else if (category === 'pet') {
        label.textContent = 'Add Pet';
      } else if (category === 'item') {
        label.textContent = 'Add Item';
      }
    }
    
    // Update counter
    this._updateCounter(category);
    
    // If a main character was removed, update owner dropdowns and summary
    if (category === 'main') {
      this._updateAllOwnerDropdowns();
      this._updateMainCharSummary();
    }
  }
  
  _updateCounter(category) {
    const count = Object.keys(this.photoData[category] || {}).length;
    let maxCount, badgeEl;
    
    switch (category) {
      case 'main':
        maxCount = 2;
        badgeEl = this.mainCharCount;
        break;
      case 'pet':
        maxCount = 2;
        badgeEl = this.petCount;
        break;
      case 'item':
        maxCount = 3;
        badgeEl = this.itemCount;
        break;
    }
    
    if (badgeEl) {
      badgeEl.textContent = `${count}/${maxCount}`;
      badgeEl.style.color = count > 0 ? 'var(--sb-success)' : '';
      badgeEl.style.fontWeight = count > 0 ? '700' : '';
    }
  }
  
  _updateAllCounters() {
    ['main', 'extra', 'pet', 'item'].forEach(category => {
      this._updateCounter(category);
    });
  }

  // ============================================
  // PRIVATE: EVENT HANDLERS
  // ============================================
  _onMagicBtnClick() {
    this.magicForm?.classList.remove('hidden');
    if (this.magicBtn) this.magicBtn.style.display = 'none';
    this.magicForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    this._emit(MagicCover.Events.FORM_REVEALED);
  }
  
  _onCreateStoryClick() {
    const id = this.sectionId;
    
    // Collect main character data
    const characters = [];
    
    // Main characters
    Object.entries(this.photoData.main).forEach(([index, data]) => {
      const nameInput = this.querySelector(`#mainCharName${index}-${id}`);
      const ageSelect = this.querySelector(`#mainCharAge${index}-${id}`);
      characters.push({
        id: `main-${index}`,
        type: 'main',
        name: nameInput?.value || '',
        age: ageSelect?.value || '',
        photo: data.preview
      });
    });
    
    // Pets with owner assignment
    const pets = [];
    Object.entries(this.photoData.pet).forEach(([index, data]) => {
      const nameInput = this.querySelector(`#petName${index}-${id}`);
      const ownerSelect = this.querySelector(`#petOwner${index}-${id}`);
      const ownerId = ownerSelect?.value || 'everyone';
      const ownerChar = characters.find(c => c.id === ownerId);
      
      pets.push({
        name: nameInput?.value || '',
        photo: data.preview,
        ownerId: ownerId,
        ownerName: ownerChar ? ownerChar.name : 'Everyone'
      });
    });
    
    // Items with owner assignment
    const items = [];
    Object.entries(this.photoData.item).forEach(([index, data]) => {
      const nameInput = this.querySelector(`#itemName${index}-${id}`);
      const ownerSelect = this.querySelector(`#itemOwner${index}-${id}`);
      const ownerId = ownerSelect?.value || 'everyone';
      const ownerChar = characters.find(c => c.id === ownerId);
      
      items.push({
        name: nameInput?.value || '',
        photo: data.preview,
        ownerId: ownerId,
        ownerName: ownerChar ? ownerChar.name : 'Everyone'
      });
    });
    
    const theme = this.themeSelect?.value || '';
    const customRequest = this.querySelector(`#magicCustom-${id}`)?.value || '';
    const coverUrl = this.generatedCover?.src || '';
    
    const storyData = {
      characters,
      pets,
      items,
      theme,
      customRequest,
      coverUrl
    };
    
    this._emit(MagicCover.Events.STORY_CREATION_STARTED, storyData);
    this._showStoryAppPlaceholder(storyData);
  }
  
  _showStoryAppPlaceholder(storyData) {
    const mainChars = storyData.characters;
    
    // Format pets with owner info
    const petsFormatted = storyData.pets.map(p => {
      const name = p.name || 'Unnamed pet';
      const owner = p.ownerName === 'Everyone' ? '' : ` → ${p.ownerName}'s`;
      return `${name}${owner}`;
    }).join(', ') || 'None';
    
    // Format items with owner info
    const itemsFormatted = storyData.items.map(i => {
      const name = i.name || 'Unnamed item';
      const owner = i.ownerName === 'Everyone' ? '' : ` → ${i.ownerName}'s`;
      return `${name}${owner}`;
    }).join(', ') || 'None';
    
    const modal = document.createElement('div');
    modal.className = 'mc-story-redirect-modal';
    modal.innerHTML = `
      <div class="mc-story-redirect-content">
        <div class="mc-story-redirect-header">
          <span class="mc-story-redirect-icon">🚀</span>
          <h3>Story Creation App</h3>
        </div>
        <p>When the web app is ready, you'll be redirected to:</p>
        <code class="mc-story-redirect-url">https://story.yourbrand.com/create?token=SESSION_TOKEN</code>
        <div class="mc-story-redirect-data">
          <strong>Data that will be passed:</strong>
          <ul>
            <li><strong>⭐ Main Heroes:</strong> ${mainChars.map(c => `${c.name || 'Unnamed'}${c.age ? `, age ${c.age}` : ''}`).join(' & ') || 'None'}</li>
            <li><strong>🐕 Pets:</strong> ${petsFormatted}</li>
            <li><strong>🧸 Items:</strong> ${itemsFormatted}</li>
            <li><strong>🎨 Theme:</strong> ${storyData.theme || 'Not selected'}</li>
            <li><strong>📖 Cover:</strong> ${storyData.coverUrl ? 'Generated ✓' : 'Not yet'}</li>
          </ul>
        </div>
        <p class="mc-story-redirect-note">
          The token will be created server-side and the app will fetch all data securely.
        </p>
        <button type="button" class="mc-story-redirect-close">Got it!</button>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .mc-story-redirect-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      .mc-story-redirect-content {
        background: white;
        padding: 32px;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        text-align: center;
      }
      .mc-story-redirect-header {
        margin-bottom: 16px;
      }
      .mc-story-redirect-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 8px;
      }
      .mc-story-redirect-header h3 {
        margin: 0;
        font-size: 24px;
        color: #0B1B2B;
      }
      .mc-story-redirect-content p {
        color: #64748b;
        margin: 12px 0;
      }
      .mc-story-redirect-url {
        display: block;
        background: #f1f5f9;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        color: #0B1B2B;
        word-break: break-all;
        margin: 16px 0;
      }
      .mc-story-redirect-data {
        background: #fef3c7;
        padding: 16px;
        border-radius: 8px;
        text-align: left;
        margin: 16px 0;
      }
      .mc-story-redirect-data strong {
        color: #92400e;
      }
      .mc-story-redirect-data ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }
      .mc-story-redirect-data li {
        margin: 4px 0;
        color: #78350f;
        font-size: 14px;
      }
      .mc-story-redirect-note {
        font-size: 13px;
        font-style: italic;
      }
      .mc-story-redirect-close {
        background: #F59E0B;
        color: white;
        border: none;
        padding: 12px 32px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 16px;
      }
      .mc-story-redirect-close:hover {
        background: #D97706;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    modal.querySelector('.mc-story-redirect-close').addEventListener('click', () => {
      modal.remove();
      style.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        style.remove();
      }
    });
  }

  _onGenerateClick() {
    if (this.isGenerating) return;
    
    // Validate: at least one main character with photo and name
    const mainChars = Object.keys(this.photoData.main);
    if (mainChars.length === 0) {
      this._showMainCharError('Please add at least one main character photo');
      return;
    }
    
    // Check if first main character has a name
    const firstMainName = this.querySelector(`#mainCharName1-${this.sectionId}`)?.value?.trim();
    if (!firstMainName && this.photoData.main['1']) {
      this._showMainCharError('Please enter a name for the main character');
      this.querySelector(`#mainCharName1-${this.sectionId}`)?.focus();
      return;
    }
    
    this._clearMainCharError();
    
    // Collect all data
    const mainCharacters = [];
    Object.entries(this.photoData.main).forEach(([index, data]) => {
      const nameInput = this.querySelector(`#mainCharName${index}-${this.sectionId}`);
      const ageSelect = this.querySelector(`#mainCharAge${index}-${this.sectionId}`);
      mainCharacters.push({
        name: nameInput?.value || '',
        age: ageSelect?.value || '',
        photo: data.preview
      });
    });
    
    const theme = this.themeSelect?.value || '';
    const customRequest = this.querySelector(`#magicCustom-${this.sectionId}`)?.value || '';

    const btn = this.generateCoverBtn;
    const textEl = btn?.querySelector('.generate-text');
    const loadingEl = btn?.querySelector('.generate-loading');
    
    this.isGenerating = true;
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }
    textEl?.classList.add('hidden');
    loadingEl?.classList.remove('hidden');
    
    if (this.generateStatus) {
      this.generateStatus.textContent = 'Creating your personalized cover, please wait...';
    }

    this._emit(MagicCover.Events.COVER_GENERATING, {
      characters: mainCharacters,
      pets: Object.keys(this.photoData.pet).length,
      items: Object.keys(this.photoData.item).length,
      theme,
      customRequest
    });

    // Mock API call
    setTimeout(() => {
      const heroName = mainCharacters[0]?.name || 'Hero';
      const imageUrl = 'https://placehold.co/400x500/1e3a5f/ffffff?text=' + encodeURIComponent(heroName + "'s\nAdventure");
      
      if (this.generatedCover) {
        this.generatedCover.src = imageUrl;
      }
      
      this.magicForm?.classList.add('hidden');
      this.coverResult?.classList.remove('hidden');
      
      if (this.generateStatus) {
        this.generateStatus.textContent = 'Your cover is ready! Click Create Your Story to continue.';
      }
      
      this._emit(MagicCover.Events.COVER_READY, { imageUrl, heroName });
      
      setTimeout(() => {
        this.coverResult?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

      this.isGenerating = false;
      if (btn) {
        btn.disabled = false;
        btn.setAttribute('aria-busy', 'false');
      }
      textEl?.classList.remove('hidden');
      loadingEl?.classList.add('hidden');
    }, 2500);
  }
  
  _showMainCharError(message) {
    const accordion = this.querySelector('[data-accordion="main-characters"]');
    const errorEl = this.querySelector(`#mainCharError-${this.sectionId}`);
    
    accordion?.classList.add('has-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
    
    // Expand the accordion if collapsed
    const header = accordion?.querySelector('.mc-accordion__header');
    const content = accordion?.querySelector('.mc-accordion__content');
    if (header?.getAttribute('aria-expanded') === 'false') {
      header.setAttribute('aria-expanded', 'true');
      content?.classList.remove('mc-accordion__content--collapsed');
    }
  }
  
  _clearMainCharError() {
    const accordion = this.querySelector('[data-accordion="main-characters"]');
    const errorEl = this.querySelector(`#mainCharError-${this.sectionId}`);
    
    accordion?.classList.remove('has-error');
    errorEl?.classList.add('hidden');
  }

  _onCountryChange(e) {
    const country = e.target.value;
    if (MagicCover.CURRENCY_MAP[country]) {
      this.currentCurrency = MagicCover.CURRENCY_MAP[country];
      this._updatePrices();
      
      this._emit(MagicCover.Events.CURRENCY_CHANGED, {
        symbol: this.currentCurrency.symbol,
        code: this.currentCurrency.code,
        country: country
      });
    }
  }

  _onPackageChange(e) {
    const selected = e.target;
    const priceKey = 'price' + this.currentCurrency.code.charAt(0).toUpperCase() + this.currentCurrency.code.slice(1);
    const price = selected.dataset[priceKey];
    
    this._updateTotal();
    
    this._emit(MagicCover.Events.PACKAGE_SELECTED, {
      package: selected.value,
      price: price,
      currency: this.currentCurrency
    });
  }

  _onFormSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    
    const formData = new FormData(this.orderForm);
    const orderData = Object.fromEntries(formData.entries());
    
    this._previousFocus = document.activeElement;
    
    this.isSubmitting = true;
    if (this.submitBtn) {
      this.submitBtn.disabled = true;
      this.submitBtn.setAttribute('aria-busy', 'true');
      this.submitBtn.innerHTML = '<span>Processing...</span>';
    }

    this._emit(MagicCover.Events.ORDER_SUBMITTING, { formData: orderData });

    setTimeout(() => {
      this.successModal?.classList.remove('hidden');
      this.orderForm?.reset();
      
      this.modalCloseBtn?.focus();
      
      this.isSubmitting = false;
      if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitBtn.setAttribute('aria-busy', 'false');
        this.submitBtn.innerHTML = `<span class="btn-text">Complete Order</span><span class="btn-price">• <span class="currency-symbol">${this.currentCurrency.symbol}</span><span class="total-price">49</span></span>`;
      }
      
      this._emit(MagicCover.Events.ORDER_SUCCESS, { formData: orderData });
    }, 1500);
  }

  _onModalClose() {
    this.successModal?.classList.add('hidden');
    
    if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
      this._previousFocus.focus();
    }
    
    this._emit(MagicCover.Events.MODAL_CLOSED);
  }

  // ============================================
  // PRIVATE: CURRENCY & PRICING
  // ============================================
  _detectCurrency() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = navigator.language || 'en-US';
      
      if (timezone.includes('London') || locale.startsWith('en-GB')) {
        return MagicCover.CURRENCY_MAP.GB;
      } else if (timezone.includes('Sydney') || timezone.includes('Melbourne') || locale.includes('AU')) {
        return MagicCover.CURRENCY_MAP.AU;
      } else if (timezone.includes('Toronto') || timezone.includes('Vancouver') || locale.includes('CA')) {
        return MagicCover.CURRENCY_MAP.CA;
      } else if (timezone.includes('Paris') || timezone.includes('Berlin') || locale.startsWith('de') || locale.startsWith('fr')) {
        return MagicCover.CURRENCY_MAP.DE;
      }
      return MagicCover.CURRENCY_MAP.US;
    } catch (e) {
      return MagicCover.CURRENCY_MAP.US;
    }
  }

  _updatePrices() {
    const packages = this.querySelectorAll('input[name="package"]');
    const symbols = this.querySelectorAll('.currency-symbol');
    
    symbols.forEach(s => s.textContent = this.currentCurrency.symbol);
    
    packages.forEach(pkg => {
      const priceKey = 'price' + this.currentCurrency.code.charAt(0).toUpperCase() + this.currentCurrency.code.slice(1);
      const price = pkg.dataset[priceKey];
      const priceDisplay = pkg.parentElement?.querySelector('.price-value');
      if (priceDisplay && price) {
        priceDisplay.textContent = price;
      }
    });
    
    this._updateTotal();
  }

  _updateTotal() {
    const selected = this.querySelector('input[name="package"]:checked');
    if (selected) {
      const priceKey = 'price' + this.currentCurrency.code.charAt(0).toUpperCase() + this.currentCurrency.code.slice(1);
      const price = selected.dataset[priceKey];
      const totalEl = this.querySelector('.total-price');
      if (totalEl) totalEl.textContent = price;
    }
  }
}

// Guarded custom element registration
if (!customElements.get('magic-cover')) {
  customElements.define('magic-cover', MagicCover);
}
