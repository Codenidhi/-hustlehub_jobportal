function initLoginSignupApp(options = {}) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const errorMsg = document.getElementById('errorMsg');
    const signupMsg = document.getElementById('signupMsg');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    });

    // Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
        const repass = document.getElementById("signupRePassword").value.trim();
        const role = document.getElementById("signupRole").value;

        if (!name || !email || !password || !repass || !role) {
            signupMsg.style.color = "red";
            signupMsg.textContent = "All fields are required!";
            return;
        }
        if (password !== repass) {
            signupMsg.style.color = "red";
            signupMsg.textContent = "Passwords do not match!";
            return;
        }

        try {
            const res = await fetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            const data = await res.json();
            if (data.success) {
                signupMsg.style.color = "green";
                signupMsg.textContent = "Sign Up Successful! Please Login.";
                signupForm.reset();
                setTimeout(() => {
                    signupTab.classList.remove('active');
                    loginTab.classList.add('active');
                    signupForm.style.display = 'none';
                    loginForm.style.display = 'block';
                    signupMsg.textContent = "";
                }, 1500);
            } else {
                signupMsg.style.color = "red";
                signupMsg.textContent = data.message;
            }
        } catch (err) {
            signupMsg.style.color = "red";
            signupMsg.textContent = "Error signing up!";
            console.error(err);
        }
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                errorMsg.textContent = "";
                alert("Welcome " + data.user.name + "!");
                localStorage.setItem("currentUser", JSON.stringify({ name: data.user.name, email: data.user.email }));
                window.location.href = "index.html";
            } else {
                errorMsg.style.color = "red";
                errorMsg.textContent = data.message;
            }
        } catch (err) {
            errorMsg.style.color = "red";
            errorMsg.textContent = "Error logging in!";
            console.error(err);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => initLoginSignupApp());
