const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'register') { switchAuthMode('register'); }

function switchAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (mode === 'login') {
        loginForm.style.display = 'block'; registerForm.style.display = 'none';
        tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    } else {
        loginForm.style.display = 'none'; registerForm.style.display = 'block';
        tabLogin.classList.remove('active'); tabRegister.classList.add('active');
    }
}

// Register
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('registerError');

    if (password.length < 6) { errorEl.textContent = "Password must be at least 6 characters."; return; }

    const existingUsers = JSON.parse(localStorage.getItem('jobTrackerUsers') || '[]');
    if (existingUsers.find(u => u.email === email)) { errorEl.textContent = "Account already exists."; return; }

    const newUser = { name, email, password };
    existingUsers.push(newUser);
    localStorage.setItem('jobTrackerUsers', JSON.stringify(existingUsers));
    loginUser(newUser);
});

// Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    const existingUsers = JSON.parse(localStorage.getItem('jobTrackerUsers') || '[]');
    const user = existingUsers.find(u => u.email === email && u.password === password);

    if (user) { loginUser(user); } else { errorEl.textContent = "Invalid email or password."; }
});

function loginUser(user) {
    localStorage.setItem('jobTrackerSession', JSON.stringify({ name: user.name, email: user.email }));
    window.location.href = 'dashboard.html';
}

if (window.location.pathname.includes('auth.html')) {
    if (localStorage.getItem('jobTrackerSession')) { window.location.href = 'dashboard.html'; }
}