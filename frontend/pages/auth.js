// auth.js - Login functionality for AHTPL ERP

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('authToken');
  if (token) {
    // User is already logged in, redirect to dashboard
    window.location.href = '/index.html';
  }

  // Check for "Remember Me" saved credentials
  const rememberedUsername = localStorage.getItem('rememberedUsername');
  if (rememberedUsername) {
    document.getElementById('loginUsername').value = rememberedUsername;
    document.getElementById('rememberMe').checked = true;
  }
});

// Toggle Password Visibility
function togglePassword() {
  const passwordInput = document.getElementById('loginPassword');
  const toggleIcon = document.getElementById('toggleIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

// Show Forgot Password Modal
function showForgotPassword() {
  document.getElementById('forgotPasswordModal').style.display = 'flex';
}

// Close Forgot Password Modal
function closeForgotPassword() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('forgotPasswordModal');
  if (event.target === modal) {
    closeForgotPassword();
  }
});

// Login Form Submit Handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  
  // Disable submit button to prevent multiple submissions
  const submitBtn = document.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  try {
    // API call to backend
    const response = await fetch('https://ahtpl-erp.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username, 
        password 
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Store authentication token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('username', data.username);
      
      // Handle "Remember Me"
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      // Show success message
      alert('✅ Login successful! Redirecting to dashboard...');
      
      // Redirect to dashboard
      window.location.href = '/index.html';
      
    } else {
      // Show error message
      alert('❌ ' + (data.message || 'Invalid username or password. Please try again.'));
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
    
  } catch (error) {
    console.error('Login error:', error);
    alert('❌ Connection error. Please check your internet connection and try again.');
    
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
});

// Handle Enter key press in password field
document.getElementById('loginPassword').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  }
});