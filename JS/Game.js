document.addEventListener('DOMContentLoaded', () => {
    const clickBtn = document.getElementById('click-btn-initial');
    const saveBtn = document.getElementById('save-btn');
    const unsavedModal = document.getElementById('unsaved-changes-modal');
    const saveAndExitBtn = document.getElementById('save-and-exit-btn');
    const saveAndReloadBtn = document.getElementById('save-and-reload-btn');
    const saveBtnModal = document.getElementById('save-btn-modal');

    window.nlick = 0;
    window.zlick = 0;
    window.hasUnsavedChanges = false;
    let notificationDismissed = false;

    clickBtn.addEventListener('click', () => {
        const currentUser = window.getCurrentUser?.();
        if (!currentUser && !notificationDismissed) {
            window.activateModal?.(document.getElementById('notification'));
        } else if (currentUser) {
            window.nlick += 0.0001;
            localStorage.setItem('nlick', window.nlick);
            document.getElementById('nlick-count').textContent = window.nlick.toFixed(4);
            window.hasUnsavedChanges = true;
        }
    });

    window.onAuthSuccess = (user) => {
        window.nlick = user.nlick || 0;
        window.zlick = user.zlick || 0;
        localStorage.setItem('nlick', window.nlick);
        localStorage.setItem('zlick', window.zlick);
        document.getElementById('nlick-count').textContent = window.nlick.toFixed(4);
        document.getElementById('zlick-count').textContent = window.zlick.toFixed(4);
        window.hasUnsavedChanges = false;
        notificationDismissed = false;

        // Подписка на transfers для уведомлений
        window.supabase
            .channel('transfers')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfers', filter: `recipient_nickname=eq.${user.nickname}` }, (payload) => {
                const { sender_nickname, type, amount } = payload.new;
                showToast(`Получено ${Number(amount).toFixed(4)} ${type} от ${sender_nickname}`);
            })
            .subscribe((status) => {
                console.log('Transfers subscription status:', status);
            });

        // Подписка на players для моментального обновления баланса
        window.supabase
            .channel('players')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `nickname=eq.${user.nickname}` }, (payload) => {
                const { nlick, zlick } = payload.new;
                window.nlick = Number(nlick);
                window.zlick = Number(zlick);
                localStorage.setItem('nlick', window.nlick);
                localStorage.setItem('zlick', window.zlick);
                document.getElementById('nlick-count').textContent = window.nlick.toFixed(4);
                document.getElementById('zlick-count').textContent = window.zlick.toFixed(4);
                window.hasUnsavedChanges = false; // Сброс, если данные синхронизированы
            })
            .subscribe((status) => {
                console.log('Players subscription status:', status);
            });
    };

    window.dismissNotification = () => {
        window.closeModal?.(document.getElementById('notification'));
        notificationDismissed = true;
    };

    saveBtn.addEventListener('click', async () => {
        await saveToSupabase();
    });

    async function saveToSupabase() {
        const currentUser = window.getCurrentUser?.();
        if (!currentUser) {
            showToast('Нет пользователя для сохранения');
            return false;
        }
        try {
            const { error } = await window.supabase
                .from('players')
                .update({
                    nlick: window.nlick,
                    zlick: window.zlick
                })
                .eq('id', currentUser.id);
            if (error) throw error;
            window.hasUnsavedChanges = false;
            showToast('Данные сохранены');
            return true;
        } catch (error) {
            showToast('Ошибка сохранения: ' + error.message);
            console.error('Save error:', error);
            return false;
        }
    }

    // Уведомление браузера при закрытии/перезагрузке
    window.addEventListener('beforeunload', (e) => {
        if (window.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'У вас есть несохранённые изменения. Вы уверены, что хотите уйти?';
            setTimeout(() => {
                if (!e.defaultPrevented) return; // Если не отменили, ничего не делаем
                window.activateModal?.(unsavedModal);
            }, 0);
        }
    });

    // Обработчики кнопок в модальном окне
    saveAndExitBtn?.addEventListener('click', async () => {
        const saved = await saveToSupabase();
        if (saved) {
            window.closeModal?.(unsavedModal);
            window.close(); // Закрытие вкладки
        }
    });

    saveAndReloadBtn?.addEventListener('click', async () => {
        const saved = await saveToSupabase();
        if (saved) {
            window.closeModal?.(unsavedModal);
            window.location.reload(); // Перезагрузка
        }
    });

    saveBtnModal?.addEventListener('click', async () => {
        const saved = await saveToSupabase();
        if (saved) {
            window.closeModal?.(unsavedModal);
            // Возвращение в игру
        }
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