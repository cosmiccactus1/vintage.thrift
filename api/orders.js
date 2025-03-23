// Modify loadUserData
async function loadUserData() {
  try {
    const token = localStorage.getItem('authToken'); // ili drugi ključ gdje je spremljen token
    const response = await fetch(`/api/users/${userData.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // ...
  } catch (error) {
    // ...
  }
}

// Modify loadUserListings
async function loadUserListings() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/articles/user/${userData.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // ...
  } catch (error) {
    // ...
  }
}

// Modify loadUserFavorites
async function loadUserFavorites() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/favorites', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // ...
  } catch (error) {
    // ...
  }
}

// Modify loadUserOrders
async function loadUserOrders() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // ...
  } catch (error) {
    // ...
  }
}
