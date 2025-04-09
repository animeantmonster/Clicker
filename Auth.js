document.addEventListener('DOMContentLoaded', () => {
    const notification = document.getElementById('notification');
    const registerModal = document.getElementById('register-modal');
    const loginModal = document.getElementById('login-modal');
    const accountModal = document.getElementById('account-modal');
    const transferModal = document.getElementById('transfer-modal');
    const noAccountTransferModal = document.getElementById('no-account-transfer-modal');
    const exitNotification = document.getElementById('exit-notification');
    const accountContent = document.getElementById('account-content');
    const registerNickname = document.getElementById('register-nickname');
    const registerPassword = document.getElementById('register-password');
    const loginNickname = document.getElementById('login-nickname');
    const loginPassword = document.getElementById('login-password');
    const passwordRequirements = document.getElementById('password-requirements');
    const registerSubmitBtn = document.getElementById('register-submit-btn');
    const registerError = document.getElementById('register-error');
    const loginError = document.getElementById('login-error');
    const saveBtn = document.getElementById('save-btn');
    const accountBtn = document.getElementById('account-btn');
    const playerNickname = document.getElementById('player-nickname');
    const overlay = document.getElementById('modal-overlay');
    const gameContainer = document.querySelector('.game-container');
    let currentUser = null;
    let activeModal = null;

    const deleteConfirmModal = document.createElement('div');
    deleteConfirmModal.id = 'delete-confirm-modal';
    deleteConfirmModal.className = 'modal glass';
    deleteConfirmModal.innerHTML = `
        <div class="modal-content">
            <p>Удалить аккаунт?</p>
            <button id="delete-yes-btn" class="btn action-btn"><i class="fas fa-check"></i> Да</button>
            <button id="delete-no-btn" class="btn action-btn"><i class="fas fa-times"></i> Нет</button>
        </div>
    `;
    document.body.appendChild(deleteConfirmModal);

    const deleteConsequencesModal = document.createElement('div');
    deleteConsequencesModal.id = 'delete-consequences-modal';
    deleteConsequencesModal.className = 'modal glass';
    deleteConsequencesModal.innerHTML = `
        <div class="modal-content">
            <p>Вы потеряете все свои данные, продолжить?</p>
            <button id="consequences-yes-btn" class="btn action-btn"><i class="fas fa-check"></i> Да</button>
            <button id="consequences-no-btn" class="btn action-btn"><i class="fas fa-times"></i> Нет</button>
        </div>
    `;
    document.body.appendChild(deleteConsequencesModal);

    const allModals = [notification, registerModal, loginModal, accountModal, transferModal, noAccountTransferModal, exitNotification, deleteConfirmModal, deleteConsequencesModal];

    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function closeAllModals() {
        allModals.forEach(modal => {
            if (modal) modal.classList.remove('active');
        });
        if (overlay) overlay.classList.remove('active');
        if (gameContainer) gameContainer.classList.remove('blurred');
        activeModal = null;
    }

    function activateModal(modal) {
        if (!modal) return;
        closeAllModals();
        modal.classList.add('active');
        if (modal !== transferModal) {
            overlay.classList.add('active');
            gameContainer.classList.add('blurred');
        }
        activeModal = modal;
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (gameContainer) gameContainer.classList.remove('blurred');
        activeModal = null;
    }

    overlay?.addEventListener('click', () => {
        if (activeModal && activeModal !== transferModal) {
            closeModal(activeModal);
        }
    });

    async function autoLogin() {
        if (!window.supabase) {
            console.error('Supabase not initialized yet, retrying in 100ms');
            setTimeout(autoLogin, 100);
            return;
        }
        const userId = localStorage.getItem('userId');
        if (userId) {
            const { data, error } = await window.supabase
                .from('players')
                .select('*')
                .eq('id', userId)
                .single();
            if (data && !error) {
                currentUser = data;
                playerNickname.textContent = currentUser.nickname;
                saveBtn.style.display = 'block';
                if (typeof window.onAuthSuccess === 'function') {
                    window.onAuthSuccess(currentUser);
                    showToast('Автозаход выполнен');
                }
            } else {
                localStorage.removeItem('userId');
                console.log('Autologin failed:', error ? error.message : 'No user data');
            }
        }
    }
    setTimeout(autoLogin, 0);

    async function checkNicknameAvailability(nickname) {
        const { data, error } = await window.supabase
            .from('players')
            .select('nickname')
            .eq('nickname', nickname);
        if (error) {
            console.error('Nickname check failed:', error.message);
            return false;
        }
        return data.length === 0;
    }

    async function loginUser(nickname, password) {
        const { data, error } = await window.supabase
            .from('players')
            .select('*')
            .eq('nickname', nickname)
            .eq('password', password)
            .single();
        if (error || !data) throw new Error('Неверный логин или пароль');
        await window.supabase
            .from('players')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);
        return data;
    }

    async function saveUserData() {
        if (!currentUser) {
            showToast('Нет пользователя для сохранения');
            return;
        }
        try {
            const { error } = await window.supabase
                .from('players')
                .update({
                    nlick: window.nlick || 0,
                    zlick: window.zlick || 0
                })
                .eq('id', currentUser.id);
            if (error) throw error;
            showToast('Сохранено');
            window.hasUnsavedChanges = false;
        } catch (error) {
            showToast('Ошибка сохранения: ' + error.message);
        }
    }

    function checkPassword(password) {
        const requirements = {
            "Минимум 6 символов": password.length >= 6,
            "Буквы верхнего и нижнего регистра": /[A-Z]/.test(password) && /[a-z]/.test(password),
            "Содержит цифры": /\d/.test(password),
            "Содержит спецсимволы": /[!@#$%^&*(),.?":{}|<>]/.test(password),
            "Без пробелов": !/\s/.test(password)
        };
        const allMet = Object.values(requirements).every(v => v);
        const html = Object.entries(requirements)
            .map(([req, met]) => `<div style="color: ${met ? '#4caf50' : '#ff7043'}">${req}: ${met ? '✓' : '✗'}</div>`)
            .join('');
        passwordRequirements.innerHTML = html;
        return allMet;
    }

    async function updateRegisterButton() {
        const nickname = registerNickname.value.trim();
        const password = registerPassword.value;
        const passwordValid = checkPassword(password);
        const nicknameValid = nickname.length > 0;
        let canRegister = passwordValid && nicknameValid;

        registerNickname.classList.remove('valid', 'invalid');
        registerPassword.classList.remove('valid', 'invalid');
        registerError.textContent = '';

        if (nicknameValid) {
            const isAvailable = await checkNicknameAvailability(nickname);
            if (isAvailable) {
                registerNickname.classList.add('valid');
            } else {
                registerNickname.classList.add('invalid');
                registerError.textContent = 'Этот никнейм уже занят!';
                canRegister = false;
            }
        } else {
            registerNickname.classList.add('invalid');
            registerError.textContent = 'Введите никнейм!';
            canRegister = false;
        }

        if (passwordValid) {
            registerPassword.classList.add('valid');
        } else {
            registerPassword.classList.add('invalid');
            registerError.textContent = 'Пароль не соответствует требованиям!';
            canRegister = false;
        }

        registerSubmitBtn.disabled = !canRegister;
    }

    registerNickname.addEventListener('input', updateRegisterButton);
    registerPassword.addEventListener('input', updateRegisterButton);

    document.getElementById('notify-register-btn').addEventListener('click', () => {
        activateModal(registerModal);
        updateRegisterButton();
    });

    document.getElementById('notify-login-btn').addEventListener('click', () => {
        activateModal(loginModal);
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (registerSubmitBtn.disabled) return;
        const nickname = registerNickname.value.trim();
        const password = registerPassword.value;

        try {
            currentUser = await window.registerUser(nickname, password);
            localStorage.setItem('userId', currentUser.id);
            playerNickname.textContent = currentUser.nickname;
            saveBtn.style.display = 'block';
            closeModal(registerModal);
            if (typeof window.onAuthSuccess === 'function') {
                window.onAuthSuccess(currentUser);
                showToast('Аккаунт создан');
            }
        } catch (error) {
            registerError.textContent = 'Ошибка регистрации: ' + error.message;
        }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nickname = loginNickname.value.trim();
        const password = loginPassword.value;
        loginError.textContent = '';
        try {
            currentUser = await loginUser(nickname, password);
            localStorage.setItem('userId', currentUser.id);
            playerNickname.textContent = currentUser.nickname;
            saveBtn.style.display = 'block';
            closeModal(loginModal);
            if (typeof window.onAuthSuccess === 'function') {
                window.onAuthSuccess(currentUser);
                showToast('Вход выполнен');
            }
        } catch (error) {
            loginError.textContent = error.message;
            setTimeout(() => loginError.textContent = '', 3000);
        }
    });

    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        activateModal(loginModal);
    });

    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        activateModal(registerModal);
        updateRegisterButton();
    });

    accountBtn.addEventListener('click', () => {
        activateModal(accountModal);
        if (currentUser) {
            accountContent.innerHTML = `
                <button id="logout-account-btn" class="btn action-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
                <button id="delete-account-btn" class="btn action-btn"><i class="fas fa-trash-alt"></i> Delete Account</button>
            `;
            document.getElementById('logout-account-btn').addEventListener('click', () => {
                currentUser = null;
                localStorage.removeItem('userId');
                saveBtn.style.display = 'none';
                playerNickname.textContent = 'Guest';
                window.nlick = 0;
                window.zlick = 0;
                document.getElementById('nlick-count').textContent = '0.0000';
                document.getElementById('zlick-count').textContent = '0.0000';
                window.hasUnsavedChanges = false;
                closeModal(accountModal);
                showToast('Выход выполнен');
            });
            document.getElementById('delete-account-btn').addEventListener('click', () => {
                activateModal(deleteConfirmModal);
            });
        } else {
            accountContent.innerHTML = `
                <button id="register-account-btn" class="btn action-btn"><i class="fas fa-user-plus"></i> Register</button>
                <button id="login-account-btn" class="btn action-btn"><i class="fas fa-sign-in-alt"></i> Login</button>
            `;
            document.getElementById('register-account-btn').addEventListener('click', () => {
                activateModal(registerModal);
                updateRegisterButton();
            });
            document.getElementById('login-account-btn').addEventListener('click', () => {
                activateModal(loginModal);
            });
        }
    });

    document.getElementById('delete-yes-btn').addEventListener('click', () => {
        closeModal(deleteConfirmModal);
        activateModal(deleteConsequencesModal);
    });
    document.getElementById('delete-no-btn').addEventListener('click', () => {
        closeModal(deleteConfirmModal);
    });

    document.getElementById('consequences-yes-btn').addEventListener('click', async () => {
        try {
            await window.deleteUser(currentUser.nickname);
            currentUser = null;
            localStorage.removeItem('userId');
            saveBtn.style.display = 'none';
            playerNickname.textContent = 'Guest';
            window.nlick = 0;
            window.zlick = 0;
            document.getElementById('nlick-count').textContent = '0.0000';
            document.getElementById('zlick-count').textContent = '0.0000';
            window.hasUnsavedChanges = false;
            closeModal(deleteConsequencesModal);
            closeModal(accountModal);
            showToast('Аккаунт удалён');
        } catch (error) {
            showToast('Ошибка удаления: ' + error.message);
        }
    });
    document.getElementById('consequences-no-btn').addEventListener('click', () => {
        closeModal(deleteConsequencesModal);
    });

    saveBtn.addEventListener('click', saveUserData);

    allModals.forEach(modal => {
        if (modal && !modal.querySelector('.close-modal-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-modal-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.addEventListener('click', () => {
                closeModal(modal);
                if (modal.id === 'notification' && typeof window.dismissNotification === 'function') {
                    window.dismissNotification();
                }
            });
            modal.insertBefore(closeBtn, modal.firstChild);
        }
    });

    window.getCurrentUser = () => currentUser;
    window.closeModal = closeModal;
    window.activateModal = activateModal;
});
