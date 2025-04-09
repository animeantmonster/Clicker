document.addEventListener('DOMContentLoaded', () => {
    const transferBtn = document.getElementById('transfer-btn');
    const transferModal = document.getElementById('transfer-modal');
    const transferType = document.getElementById('transfer-type');
    const transferRecipient = document.getElementById('transfer-recipient');
    const transferAmount = document.getElementById('transfer-amount');
    const transferSubmitBtn = document.getElementById('transfer-submit-btn');
    const feeAmount = document.getElementById('fee-amount');
    const totalAmount = document.getElementById('total-amount');
    const transferError = document.getElementById('transfer-error');
    const clickerContainer = document.querySelector('.clicker-container');
    const noAccountModal = document.getElementById('no-account-transfer-modal');
    const transferAttemptType = document.getElementById('transfer-attempt-type');
    const closeNoAccountBtn = document.getElementById('close-no-account-btn');
    const noAccountRegisterBtn = document.getElementById('no-account-register-btn');
    const noAccountLoginBtn = document.getElementById('no-account-login-btn');
    const amountMenuBtn = document.createElement('button');
    const amountMenu = document.createElement('div');
    let isTransferOpen = false;
    let isAmountMenuOpen = false;

    amountMenuBtn.id = 'amount-menu-btn';
    amountMenuBtn.textContent = '▼';
    amountMenuBtn.style.display = 'none';
    amountMenu.id = 'amount-menu';
    amountMenu.className = 'amount-menu';
    amountMenu.innerHTML = `
        <button id="max-amount">Максимум</button>
        <button id="half-amount">Половина</button>
    `;
    const amountContainer = transferAmount.closest('.input-container');
    amountContainer.appendChild(amountMenuBtn);
    transferModal.appendChild(amountMenu);

    transferBtn.addEventListener('click', () => {
        if (!isTransferOpen) {
            window.closeModal?.(document.querySelector('.modal.active'));
            transferModal.classList.add('active');
            clickerContainer.classList.add('hidden');
            isTransferOpen = true;
        } else {
            window.closeModal?.(transferModal);
            clickerContainer.classList.remove('hidden');
            isTransferOpen = false;
        }
    });

    async function validateRecipient() {
        const nickname = transferRecipient.value.trim();
        const currentNickname = document.getElementById('player-nickname').textContent;

        if (!nickname) {
            transferRecipient.classList.remove('valid', 'invalid');
            transferError.textContent = 'Введите имя игрока';
            return false;
        }

        if (nickname === currentNickname && currentNickname !== 'Guest') {
            transferRecipient.classList.add('invalid');
            transferRecipient.classList.remove('valid');
            transferError.textContent = 'Нельзя отправить себе';
            return false;
        }

        const { data, error } = await window.supabase
            .from('players')
            .select('id')
            .eq('nickname', nickname)
            .single();
        
        if (data && !error) {
            transferRecipient.classList.add('valid');
            transferRecipient.classList.remove('invalid');
            transferError.textContent = '';
            return true;
        } else {
            transferRecipient.classList.add('invalid');
            transferRecipient.classList.remove('valid');
            transferError.textContent = 'Игрок не найден';
            return false;
        }
    }

    async function getPlayerBalance(type) {
        const nickname = document.getElementById('player-nickname').textContent;
        if (nickname === 'Guest') return 0;
        const { data, error } = await window.supabase
            .from('players')
            .select(type)
            .eq('nickname', nickname)
            .single();
        return error || !data ? 0 : Number(data[type]);
    }

    async function checkBalance() {
        const amount = parseFloat(transferAmount.value) || 0;
        const type = transferType.value;
        if (!type) {
            transferError.textContent = 'Выберите тип валюты';
            return false;
        }
        if (amount < 0.001) {
            transferError.textContent = 'Минимальная сумма: 0.001';
            return false;
        }

        const feeRate = type === 'nlick' ? 0.15 : 0.20;
        const fee = amount * feeRate;
        const total = amount + fee;
        const balance = await getPlayerBalance(type);
        if (Number(balance.toFixed(4)) < Number(total.toFixed(4))) {
            transferError.textContent = `Недостаточно ${type === 'nlick' ? 'Nlick' : 'Zlick'}`;
            return false;
        }
        transferError.textContent = '';
        return true;
    }

    function calculateFeeAndTotal() {
        const amount = parseFloat(transferAmount.value) || 0;
        const type = transferType.value;
        let fee = 0;
        if (type === 'nlick') {
            fee = amount * 0.15;
            feeAmount.textContent = '15%';
        } else if (type === 'zlick') {
            fee = amount * 0.20;
            feeAmount.textContent = '20%';
        } else {
            feeAmount.textContent = '0%';
        }
        const total = amount + fee;
        totalAmount.textContent = Number(total).toFixed(4);
    }

    async function validateForm() {
        const nickname = document.getElementById('player-nickname').textContent;
        if (nickname === 'Guest') return true;
        const isRecipientValid = await validateRecipient();
        const isAmountValid = (parseFloat(transferAmount.value) || 0) >= 0.001;
        const isBalanceEnough = await checkBalance();
        const type = transferType.value;
        const isValid = isRecipientValid && type && isAmountValid && isBalanceEnough;
        transferSubmitBtn.disabled = !isValid;
        return isValid;
    }

    transferType.addEventListener('change', () => {
        amountMenuBtn.style.display = transferType.value ? 'inline-block' : 'none';
        calculateFeeAndTotal();
        validateForm();
    });

    transferRecipient.addEventListener('input', validateForm);
    transferAmount.addEventListener('input', () => {
        calculateFeeAndTotal();
        validateForm();
    });

    amountMenuBtn.addEventListener('click', () => {
        if (!isAmountMenuOpen) {
            const btnRect = amountMenuBtn.getBoundingClientRect();
            const modalRect = transferModal.getBoundingClientRect();
            amountMenu.style.left = `${btnRect.right - modalRect.left + 10}px`;
            amountMenu.style.top = `${btnRect.bottom - modalRect.top}px`;
            amountMenu.style.display = 'block';
            isAmountMenuOpen = true;
        } else {
            amountMenu.style.display = 'none';
            isAmountMenuOpen = false;
        }
    });

    amountMenu.querySelector('#max-amount').addEventListener('click', async () => {
        const type = transferType.value;
        if (!type) return;
        const balance = await getPlayerBalance(type);
        const feeRate = type === 'nlick' ? 0.15 : 0.20;
        const maxAmount = balance / (1 + feeRate);
        transferAmount.value = Number(maxAmount).toFixed(4);
        calculateFeeAndTotal();
        validateForm();
        amountMenu.style.display = 'none';
        isAmountMenuOpen = false;
    });

    amountMenu.querySelector('#half-amount').addEventListener('click', async () => {
        const type = transferType.value;
        if (!type) return;
        const balance = await getPlayerBalance(type);
        const feeRate = type === 'nlick' ? 0.15 : 0.20;
        const halfAmount = (balance / (1 + feeRate)) / 2;
        transferAmount.value = Number(halfAmount).toFixed(4);
        calculateFeeAndTotal();
        validateForm();
        amountMenu.style.display = 'none';
        isAmountMenuOpen = false;
    });

    transferSubmitBtn.addEventListener('click', async () => {
        const amount = parseFloat(transferAmount.value);
        const type = transferType.value;
        const recipient = transferRecipient.value;
        const nickname = document.getElementById('player-nickname').textContent;

        if (nickname === 'Guest') {
            transferAttemptType.textContent = type === 'nlick' ? 'Nlick' : 'Zlick';
            window.activateModal?.(noAccountModal);
            return;
        }

        const isValid = await validateForm();
        if (!isValid) return;

        const fee = type === 'nlick' ? amount * 0.15 : amount * 0.20;
        const totalCost = amount + fee;

        try {
            const { data: senderData, error: senderError } = await window.supabase
                .from('players')
                .select(type)
                .eq('nickname', nickname)
                .single();
            if (senderError || !senderData) throw new Error('Не удалось найти ваш аккаунт.');

            const newSenderBalance = Number(senderData[type] - totalCost).toFixed(4);
            const { error: deductError } = await window.supabase
                .from('players')
                .update({ [type]: newSenderBalance })
                .eq('nickname', nickname);
            if (deductError) throw new Error('Ошибка списания средств.');

            if (type === 'nlick') {
                window.nlick = parseFloat(newSenderBalance);
                localStorage.setItem('nlick', window.nlick);
                document.getElementById('nlick-count').textContent = window.nlick.toFixed(4);
            } else {
                window.zlick = parseFloat(newSenderBalance);
                localStorage.setItem('zlick', window.zlick);
                document.getElementById('zlick-count').textContent = window.zlick.toFixed(4);
            }
            // Не устанавливаем hasUnsavedChanges = true, так как данные уже в Supabase

            const { data: recipientData, error: recipientError } = await window.supabase
                .from('players')
                .select(type)
                .eq('nickname', recipient)
                .single();
            if (recipientError || !recipientData) throw new Error('Получатель не найден.');

            const newRecipientBalance = Number(recipientData[type] + amount).toFixed(4);
            const { error: addError } = await window.supabase
                .from('players')
                .update({ [type]: newRecipientBalance, last_sender: nickname })
                .eq('nickname', recipient);
            if (addError) throw new Error('Ошибка зачисления средств.');

            const { data: transferData, error: transferError } = await window.supabase
                .from('transfers')
                .insert({
                    sender_nickname: nickname,
                    recipient_nickname: recipient,
                    type: type,
                    amount: amount
                })
                .select('id')
                .single();
            if (transferError || !transferData) throw new Error('Ошибка записи транзакции.');

            setTimeout(async () => {
                const { error: deleteError } = await window.supabase
                    .from('transfers')
                    .delete()
                    .eq('id', transferData.id);
                if (deleteError) console.error('Ошибка удаления транзакции:', deleteError);
            }, 3000);

            const currentUser = window.getCurrentUser?.();
            if (currentUser && currentUser.nickname === recipient) {
                if (type === 'nlick') {
                    window.nlick = parseFloat(newRecipientBalance);
                    localStorage.setItem('nlick', window.nlick);
                    document.getElementById('nlick-count').textContent = window.nlick.toFixed(4);
                } else {
                    window.zlick = parseFloat(newRecipientBalance);
                    localStorage.setItem('zlick', window.zlick);
                    document.getElementById('zlick-count').textContent = window.zlick.toFixed(4);
                }
                showToast(`Получено ${amount.toFixed(4)} ${type} от ${nickname}`);
            }

            showToast(`Успешно отправлено ${amount.toFixed(4)} ${type} для ${recipient}!`);

            window.closeModal?.(transferModal);
            clickerContainer.classList.remove('hidden');
            isTransferOpen = false;
        } catch (error) {
            transferError.textContent = error.message;
            console.error('Transfer error:', error);
        }
    });

    const transferCloseBtn = transferModal.querySelector('.close-modal-btn');
    if (transferCloseBtn) {
        transferCloseBtn.addEventListener('click', () => {
            window.closeModal?.(transferModal);
            clickerContainer.classList.remove('hidden');
            isTransferOpen = false;
        });
    }

    if (closeNoAccountBtn) {
        closeNoAccountBtn.addEventListener('click', () => {
            window.closeModal?.(noAccountModal);
            if (!transferModal.classList.contains('active')) {
                clickerContainer.classList.remove('hidden');
            }
        });
    }

    noAccountRegisterBtn.addEventListener('click', () => {
        window.closeModal?.(noAccountModal);
        window.activateModal?.(document.getElementById('register-modal'));
    });

    noAccountLoginBtn.addEventListener('click', () => {
        window.closeModal?.(noAccountModal);
        window.activateModal?.(document.getElementById('login-modal'));
    });

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
});