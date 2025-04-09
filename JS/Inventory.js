document.addEventListener('DOMContentLoaded', () => {
    const inventoryItems = document.getElementById('inventory-items');
    const tradeItem = document.getElementById('trade-item');

    function updateInventory(items) {
        inventoryItems.innerHTML = items.map(item => `<div>${item}</div>`).join('');
        tradeItem.innerHTML = '<option value="">Выбери предмет</option>' + 
            items.map(item => `<option value="${item}">${item}</option>`).join('');
    }

    window.onAuthSuccess = (user) => {
        updateInventory(user.purchased_items || []);
    };

    window.updateInventory = updateInventory;
    window.getInventory = () => window.getCurrentUser()?.purchased_items || [];
});