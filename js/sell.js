/**
 * Vintage Thrift Store - Enhanced Sell Page JavaScript
 * Improved version with better structure and error handling
 */

class SellPage {
  constructor() {
    this.uploadedImages = [];
    this.init();
  }

  async init() {
    try {
      this.userData = this.checkUserLoggedIn();
      if (!this.userData) return;

      console.log('Authenticated user:', this.userData);
      
      this.initHamburgerMenu();
      this.initPhotoUpload();
      this.initFormEvents();
      this.loadCategories();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showMessage('Došlo je do greške prilikom inicijalizacije stranice', 'error');
    }
  }

  // User authentication
  checkUserLoggedIn() {
    const userDataString = localStorage.getItem('prijavljeniKorisnik');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('authToken');
    
    if (!userDataString || !userId || !token) {
      window.location.href = 'register.html';
      return null;
    }
    
    try {
      const userData = JSON.parse(userDataString);
      return { ...userData, id: userId };
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = 'register.html';
      return null;
    }
  }

  // Photo upload functionality
  initPhotoUpload() {
    const photoUploadBtn = document.getElementById('photo-upload-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const photoUploadContainer = document.querySelector('.photo-upload-container');
    
    if (!photoUploadBtn || !photoUploadInput || !photoUploadContainer) {
      console.warn('Photo upload elements not found');
      return;
    }
    
    photoUploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      photoUploadInput.click();
    });
    
    photoUploadInput.addEventListener('change', (e) => this.handleFileSelection(e));
    
    // Drag and drop handlers
    photoUploadContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      photoUploadContainer.classList.add('dragover');
    });
    
    photoUploadContainer.addEventListener('dragleave', () => {
      photoUploadContainer.classList.remove('dragover');
    });
    
    photoUploadContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      photoUploadContainer.classList.remove('dragover');
      
      if (e.dataTransfer.files.length > 0) {
        photoUploadInput.files = e.dataTransfer.files;
        this.handleFileSelection({ target: photoUploadInput });
      }
    });
  }

  handleFileSelection(e) {
    const files = e.target.files;
    const uploadedPhotosContainer = document.getElementById('uploaded-photos');
    
    if (!files || !uploadedPhotosContainer) return;
    
    // Validate files
    if (files.length > 5) {
      this.showMessage('Možete uploadovati maksimalno 5 slika.', 'error');
      return;
    }
    
    // Reset container and array
    uploadedPhotosContainer.innerHTML = '';
    this.uploadedImages = [];
    
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        this.showMessage('Možete uploadovati samo slike.', 'error');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('Slika ne smije biti veća od 5MB.', 'error');
        return;
      }
      
      this.uploadedImages.push(file);
      this.createImagePreview(file, index, uploadedPhotosContainer);
    });
  }

  createImagePreview(file, index, container) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const photoContainer = document.createElement('div');
      photoContainer.className = 'uploaded-photo';
      
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Uploaded photo preview';
      
      const removeBtn = document.createElement('div');
      removeBtn.className = 'remove-photo';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.dataset.index = index;
      removeBtn.addEventListener('click', () => this.removeImage(index, photoContainer));
      
      photoContainer.append(img, removeBtn);
      container.appendChild(photoContainer);
    };
    
    reader.readAsDataURL(file);
  }

  removeImage(index, container) {
    this.uploadedImages.splice(index, 1);
    container.remove();
    
    // Update remaining buttons' indices
    document.querySelectorAll('.remove-photo').forEach((btn, idx) => {
      if (idx >= index) {
        btn.dataset.index = idx;
      }
    });
  }

  // Form handling
  initFormEvents() {
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const form = document.getElementById('prodaj-form');
    
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => this.saveAsDraft());
    }
    
    if (form) {
      form.addEventListener('submit', (e) => this.publishArticle(e));
    }
    
    // Clear error states on input
    document.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => {
        field.classList.remove('error');
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
      });
    });
  }

  async loadCategories() {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to load categories');
      
      const categories = await response.json();
      this.populateCategoryDropdowns(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.showMessage('Došlo je do greške prilikom učitavanja kategorija', 'error');
    }
  }

  populateCategoryDropdowns(categories) {
    const mainCatSelect = document.getElementById('main-category');
    const subCatSelect = document.getElementById('subcategory');
    
    if (mainCatSelect) {
      // Clear existing options except the first one
      while (mainCatSelect.options.length > 1) {
        mainCatSelect.remove(1);
      }
      
      // Add main categories
      categories.main.forEach(cat => {
        const option = new Option(cat.name, cat.id);
        mainCatSelect.add(option);
      });
      
      // Add event listener for subcategory loading
      mainCatSelect.addEventListener('change', () => {
        this.loadSubcategories(mainCatSelect.value);
      });
    }
    
    if (subCatSelect) {
      // Initial subcategories load if main category is preselected
      if (mainCatSelect && mainCatSelect.value) {
        this.loadSubcategories(mainCatSelect.value);
      }
    }
  }

  async loadSubcategories(mainCategoryId) {
    const subCatSelect = document.getElementById('subcategory');
    if (!subCatSelect) return;
    
    try {
      const response = await fetch(`/api/categories/${mainCategoryId}/subcategories`);
      if (!response.ok) throw new Error('Failed to load subcategories');
      
      const subcategories = await response.json();
      
      // Clear existing options except the first one
      while (subCatSelect.options.length > 1) {
        subCatSelect.remove(1);
      }
      
      // Add new subcategories
      subcategories.forEach(subcat => {
        const option = new Option(subcat.name, subcat.id);
        subCatSelect.add(option);
      });
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  }

  validateForm() {
    let isValid = true;
    const form = document.getElementById('prodaj-form');
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    
    // Validate required fields
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add('error');
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Ovo polje je obavezno';
        field.parentNode.appendChild(errorMsg);
      }
    });
    
    // Validate images
    if (this.uploadedImages.length === 0) {
      isValid = false;
      const uploadContainer = document.querySelector('.photo-upload-container');
      uploadContainer.classList.add('error');
      
      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.textContent = 'Potrebno je dodati bar jednu sliku';
      uploadContainer.parentNode.appendChild(errorMsg);
    }
    
    return isValid;
  }

  async saveAsDraft() {
    if (!this.validateForm()) {
      this.showMessage('Molimo popunite sva obavezna polja.', 'error');
      return;
    }
    
    try {
      this.showMessage('Spremanje nacrta u toku...', 'info');
      
      const formData = this.prepareFormData('draft');
      const response = await this.submitForm('/api/articles/draft', formData);
      
      this.showMessage('Nacrt je uspješno sačuvan!', 'success');
      setTimeout(() => window.location.href = 'profile.html#drafts', 2000);
    } catch (error) {
      console.error('Draft save error:', error);
      this.showMessage(error.message || 'Greška prilikom spremanja nacrta', 'error');
    }
  }

  async publishArticle(e) {
    e.preventDefault();
    
    if (!this.validateForm()) {
      this.showMessage('Molimo popunite sva obavezna polja.', 'error');
      return;
    }
    
    try {
      this.showMessage('Objavljivanje artikla u toku...', 'info');
      
      const formData = this.prepareFormData('active');
      const response = await this.submitForm('/api/articles', formData);
      
      this.showMessage('Artikal je uspješno objavljen!', 'success');
      setTimeout(() => window.location.href = 'index.html', 2000);
    } catch (error) {
      console.error('Publish error:', error);
      this.showMessage(error.message || 'Greška prilikom objavljivanja', 'error');
    }
  }

  prepareFormData(status) {
    const formData = new FormData(document.getElementById('prodaj-form'));
    
    this.uploadedImages.forEach((img, i) => {
      formData.append(`images[${i}]`, img);
    });
    
    formData.append('status', status);
    formData.append('userId', this.userData.id);
    
    return formData;
  }

  async submitForm(url, formData) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Niste prijavljeni');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
    }
    
    return await response.json();
  }

  async parseError(response) {
    try {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return errorData.message || errorData.error || 'Unknown error';
      } catch {
        return errorText || 'Unknown error';
      }
    } catch {
      return response.status === 504 ? 
        'Operacija je trajala predugo. Probajte sa manjim slikama.' : 
        'Došlo je do greške';
    }
  }

  // UI Helpers
  initHamburgerMenu() {
    const hamburgerIcon = document.getElementById('hamburgerIcon');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (!hamburgerIcon || !menuDropdown) return;
    
    hamburgerIcon.addEventListener('click', () => {
      hamburgerIcon.classList.toggle('active');
      menuDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
      if (!hamburgerIcon.contains(e.target) && !menuDropdown.contains(e.target)) {
        hamburgerIcon.classList.remove('active');
        menuDropdown.classList.remove('show');
      }
    });
  }

  showMessage(message, type = 'info') {
    let container = document.getElementById('message-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'message-container';
      document.body.appendChild(container);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    container.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.classList.add('hide');
      setTimeout(() => messageEl.remove(), 500);
    }, 3000);
  }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SellPage();
});
