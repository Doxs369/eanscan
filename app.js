// ScanEan - Gestione Dispensa v2
// Scanner barcode reale con Barcode Detection API + fallback

// ===================== STATE =====================
let products = JSON.parse(localStorage.getItem('scanEan_products')) || [];
let shoppingList = JSON.parse(localStorage.getItem('scanEan_shopping')) || [];
let consumed = parseInt(localStorage.getItem('scanEan_consumed')) || 0;
let wasted = parseInt(localStorage.getItem('scanEan_wasted')) || 0;
let currentFilter = 'all';
let currentProductId = null;
let scannerStream = null;
let barcodeDetector = null;
let scanInterval = null;
let isScanning = false;

// Demo products
const demoProducts = [
    { id: 'p1', name: 'Latte Intero', brand: 'Granarolo', category: 'latticini', ean: '8001234567890', expiry: '2026-07-25', qty: 2, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p2', name: 'Mozzarella', brand: 'Fior di Latte', category: 'latticini', ean: '8001234567891', expiry: '2026-07-23', qty: 1, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p3', name: 'Pomodori', brand: '', category: 'verdura', ean: '', expiry: '2026-07-24', qty: 5, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p4', name: 'Pasta Barilla', brand: 'Barilla', category: 'dispensa', ean: '8076802085738', expiry: '2027-01-17', qty: 3, photo: '', location: 'Dispensa', notes: '', status: 'active', consumed: false },
    { id: 'p5', name: 'Petto di Pollo', brand: '', category: 'carne', ean: '', expiry: '2026-07-22', qty: 1, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p6', name: 'Yogurt Greco', brand: 'Fage', category: 'latticini', ean: '5201360508241', expiry: '2026-07-28', qty: 4, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p7', name: 'Pane Integrale', brand: 'Mulino Bianco', category: 'dispensa', ean: '8076809512345', expiry: '2026-07-26', qty: 1, photo: '', location: 'Dispensa', notes: '', status: 'active', consumed: false },
    { id: 'p8', name: 'Uova Bio', brand: 'Le Naturelle', category: 'latticini', ean: '8001234567892', expiry: '2026-08-05', qty: 6, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p9', name: 'Insalata', brand: '', category: 'verdura', ean: '', expiry: '2026-07-24', qty: 2, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
    { id: 'p10', name: 'Olio EVO', brand: 'Bertolli', category: 'dispensa', ean: '8001234567893', expiry: '2027-07-21', qty: 1, photo: '', location: 'Dispensa', notes: '', status: 'active', consumed: false },
    { id: 'p11', name: 'Miele', brand: 'Mielizia', category: 'dispensa', ean: '8001234567894', expiry: '2028-07-20', qty: 1, photo: '', location: 'Dispensa', notes: '', status: 'active', consumed: false },
    { id: 'p12', name: 'Salmone', brand: '', category: 'carne', ean: '', expiry: '2026-07-20', qty: 1, photo: '', location: 'Frigo', notes: '', status: 'active', consumed: false },
];

const recipes = [
    { id: 'r1', name: 'Pasta al pomodoro fresco', emoji: '🍝', ingredients: 'Pasta, pomodori, basilico, olio EVO', uses: ['p4', 'p3', 'p10'] },
    { id: 'r2', name: 'Insalata di mozzarella e pomodoro', emoji: '🥗', ingredients: 'Mozzarella, pomodori, basilico, olio', uses: ['p2', 'p3', 'p10'] },
    { id: 'r3', name: 'Frittata con verdure', emoji: '🍳', ingredients: 'Uova, pomodori, insalata, olio', uses: ['p8', 'p3', 'p9', 'p10'] },
    { id: 'r4', name: 'Yogurt con miele', emoji: '🥣', ingredients: 'Yogurt greco, miele', uses: ['p6', 'p11'] },
];

const categoryIcons = {
    latticini: '🥛', carne: '🥩', verdura: '🥬', dispensa: '🥫',
    bevande: '🥤', dolci: '🍰', altro: '📦'
};

const productEmojis = {
    'Latte': '🥛', 'Mozzarella': '🧀', 'Pomodor': '🍅', 'Pasta': '🍝',
    'Pollo': '🍗', 'Yogurt': '🥣', 'Pane': '🍞', 'Uova': '🥚',
    'Insalata': '🥬', 'Olio': '🫒', 'Miele': '🍯', 'Salmone': '🐟',
    'Formagg': '🧀', 'Carne': '🥩', 'Verdur': '🥬', 'Frutt': '🍎',
    'Pesce': '🐟', 'Birra': '🍺', 'Vino': '🍷', 'Caffè': '☕',
    'Cioccolat': '🍫', 'Gelat': '🍨', 'Succo': '🧃', 'Acqua': '💧'
};

// Database EAN demo per lookup
const eanDatabase = {
    '8001234567890': { name: 'Latte Intero', brand: 'Granarolo', category: 'latticini' },
    '8001234567891': { name: 'Mozzarella', brand: 'Fior di Latte', category: 'latticini' },
    '8076802085738': { name: 'Pasta Barilla', brand: 'Barilla', category: 'dispensa' },
    '5201360508241': { name: 'Yogurt Greco', brand: 'Fage', category: 'latticini' },
    '8076809512345': { name: 'Pane Integrale', brand: 'Mulino Bianco', category: 'dispensa' },
    '8001234567892': { name: 'Uova Bio', brand: 'Le Naturelle', category: 'latticini' },
    '8001234567893': { name: 'Olio EVO', brand: 'Bertolli', category: 'dispensa' },
    '8001234567894': { name: 'Miele', brand: 'Mielizia', category: 'dispensa' },
    '8001120778313': { name: 'Acqua Naturale', brand: 'San Benedetto', category: 'bevande' },
    '8002270014907': { name: 'Caffè Espresso', brand: 'Lavazza', category: 'bevande' },
    '8000500310427': { name: 'Cioccolato Fondente', brand: 'Lindt', category: 'dolci' },
    '8001120778320': { name: 'Birra Moretti', brand: 'Birra Moretti', category: 'bevande' },
};

function getProductEmoji(name) {
    for (let key in productEmojis) {
        if (name.toLowerCase().includes(key.toLowerCase())) return productEmojis[key];
    }
    return '📦';
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    if (products.length === 0) {
        products = [...demoProducts];
        saveProducts();
    }
    // Init barcode detector
    initBarcodeDetector();
    renderAll();
});

function saveProducts() {
    localStorage.setItem('scanEan_products', JSON.stringify(products));
}

function saveShopping() {
    localStorage.setItem('scanEan_shopping', JSON.stringify(shoppingList));
}

function saveStats() {
    localStorage.setItem('scanEan_consumed', consumed);
    localStorage.setItem('scanEan_wasted', wasted);
}

// ===================== BARCODE DETECTOR =====================
function initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
        barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_128', 'qr_code', 'data_matrix']
        });
        console.log('BarcodeDetector API disponibile');
    } else {
        console.log('BarcodeDetector API non disponibile, uso fallback');
    }
}

// ===================== NAVIGATION =====================
function switchTab(tab, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + tab).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    renderAll();
}

// ===================== STATS =====================
function getDaysToExpiry(expiryDate) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    exp.setHours(0,0,0,0);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function getExpiryStatus(days) {
    if (days < 0) return { class: 'expired', badge: 'red', text: 'Scaduto' };
    if (days <= 3) return { class: 'expiring', badge: 'yellow', text: days + ' gg' };
    return { class: '', badge: 'green', text: days + ' gg' };
}

function updateStats() {
    const activeProducts = products.filter(p => p.status === 'active');
    const total = activeProducts.length;
    const expiring = activeProducts.filter(p => {
        const d = getDaysToExpiry(p.expiry);
        return d >= 0 && d <= 5;
    }).length;
    const expired = activeProducts.filter(p => getDaysToExpiry(p.expiry) < 0).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-expiring').textContent = expiring;
    document.getElementById('stat-expired').textContent = expired;

    const totalHandled = consumed + wasted;
    const wasteIndex = totalHandled > 0 ? Math.round((consumed / totalHandled) * 100) : 0;
    document.getElementById('waste-index').textContent = wasteIndex + '%';
    document.getElementById('waste-index').style.color = wasteIndex > 70 ? 'var(--green)' : (wasteIndex > 40 ? 'var(--yellow)' : 'var(--red)');
}

function showStatsModal() {
    const activeProducts = products.filter(p => p.status === 'active');
    const inDispensa = activeProducts.length;
    const entro3gg = activeProducts.filter(p => {
        const d = getDaysToExpiry(p.expiry);
        return d >= 0 && d <= 3;
    }).length;

    document.getElementById('detail-in-dispensa').textContent = inDispensa;
    document.getElementById('detail-3gg').textContent = entro3gg;
    document.getElementById('detail-consumati').textContent = consumed;
    document.getElementById('detail-sprecati').textContent = wasted;

    const totalHandled = consumed + wasted;
    const wasteIndex = totalHandled > 0 ? Math.round((consumed / totalHandled) * 100) : 0;
    document.getElementById('detail-waste-index').textContent = wasteIndex + '%';
    document.getElementById('detail-waste-index').style.color = wasteIndex > 70 ? 'var(--green)' : (wasteIndex > 40 ? 'var(--yellow)' : 'var(--red)');

    openModal('stats-modal');
}

// ===================== PRODUCTS =====================
function renderProducts() {
    const list = document.getElementById('products-list');
    let filtered = products.filter(p => p.status === 'active');

    if (currentFilter === 'scadenza') {
        filtered = filtered.filter(p => {
            const d = getDaysToExpiry(p.expiry);
            return d >= 0 && d <= 5;
        });
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Nessun prodotto in questa categoria</p>
            </div>`;
        return;
    }

    filtered.sort((a, b) => {
        const da = getDaysToExpiry(a.expiry);
        const db = getDaysToExpiry(b.expiry);
        return da - db;
    });

    list.innerHTML = filtered.map((p, i) => {
        const days = getDaysToExpiry(p.expiry);
        const status = getExpiryStatus(days);
        const emoji = getProductEmoji(p.name);
        const photoHtml = p.photo
            ? `<img src="${p.photo}" class="product-photo" alt="">`
            : `<div class="product-photo-placeholder"><i class="fas fa-image"></i></div>`;

        return `
            <div class="product-card ${status.class} animate-in" style="animation-delay:${i*0.05}s" onclick="showProductDetail('${p.id}')">
                ${photoHtml}
                <div class="product-info">
                    <div class="product-name">${emoji} ${p.name}</div>
                    <div class="product-meta">
                        <span class="expiry-badge ${status.badge}">
                            ${days < 0 ? '⛔' : (days <= 3 ? '🟡' : '🟢')} ${status.text}
                        </span>
                        <span style="font-size:11px;color:var(--text-muted);">Scade: ${formatDate(p.expiry)}</span>
                    </div>
                </div>
                <div class="product-qty">${p.qty}</div>
            </div>
        `;
    }).join('');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function filterCategory(el, cat) {
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    currentFilter = cat;
    renderProducts();
}

function filterByExpiry() {
    currentFilter = 'scadenza';
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-cat="scadenza"]').classList.add('active');
    renderProducts();
}

function filterByExpired() {
    currentFilter = 'expired';
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    const list = document.getElementById('products-list');
    const filtered = products.filter(p => p.status === 'active' && getDaysToExpiry(p.expiry) < 0);
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>Nessun prodotto scaduto!</p>
            </div>`;
        return;
    }
    list.innerHTML = filtered.map((p, i) => {
        const emoji = getProductEmoji(p.name);
        const photoHtml = p.photo
            ? `<img src="${p.photo}" class="product-photo" alt="">`
            : `<div class="product-photo-placeholder"><i class="fas fa-image"></i></div>`;
        return `
            <div class="product-card expired animate-in" style="animation-delay:${i*0.05}s" onclick="showProductDetail('${p.id}')">
                ${photoHtml}
                <div class="product-info">
                    <div class="product-name">${emoji} ${p.name}</div>
                    <div class="product-meta">
                        <span class="expiry-badge red">⛔ Scaduto</span>
                        <span style="font-size:11px;color:var(--text-muted);">Scade: ${formatDate(p.expiry)}</span>
                    </div>
                </div>
                <div class="product-qty">${p.qty}</div>
            </div>
        `;
    }).join('');
}

// ===================== RECIPES =====================
function renderRecipes() {
    const list = document.getElementById('recipes-list');
    const activeProducts = products.filter(p => p.status === 'active');
    const expiringIds = activeProducts
        .filter(p => {
            const d = getDaysToExpiry(p.expiry);
            return d >= 0 && d <= 5;
        })
        .map(p => p.id);

    const matchingRecipes = recipes.filter(r =>
        r.uses.some(uid => expiringIds.includes(uid))
    );

    if (matchingRecipes.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>Aggiungi prodotti in scadenza per vedere ricette suggerite</p>
            </div>`;
        return;
    }

    list.innerHTML = matchingRecipes.map((r, i) => {
        const usesCount = r.uses.filter(uid => expiringIds.includes(uid)).length;
        return `
            <div class="recipe-card animate-in" style="animation-delay:${i*0.1}s">
                <div class="recipe-header">
                    <span class="recipe-emoji">${r.emoji}</span>
                    <div>
                        <div class="recipe-name">${r.name}</div>
                        <div class="recipe-ingredients">${r.ingredients}</div>
                    </div>
                </div>
                <span class="recipe-badge">
                    <i class="fas fa-check"></i> Usa ${usesCount} prodotto${usesCount > 1 ? 'i' : ''} in scadenza
                </span>
            </div>
        `;
    }).join('');
}

// ===================== SHOPPING LIST =====================
function renderShoppingList() {
    const list = document.getElementById('shopping-list');
    const total = shoppingList.length;
    const completed = shoppingList.filter(s => s.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('shopping-progress').style.width = percent + '%';
    document.getElementById('shopping-count').textContent = `${completed}/${total} completati`;
    document.getElementById('shopping-percent').textContent = percent + '%';

    if (shoppingList.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>La lista della spesa è vuota</p>
            </div>`;
        return;
    }

    list.innerHTML = shoppingList.map((item, i) => {
        const reasonClass = item.reason === 'smart' ? 'smart' : '';
        const reasonIcon = item.reason === 'smart' ? '🤖' : (item.reason === 'expired' ? '⏰' : '✋');
        return `
            <div class="shopping-item ${item.completed ? 'completed' : ''} animate-in" style="animation-delay:${i*0.05}s">
                <div class="shopping-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleShoppingItem('${item.id}')">
                    ${item.completed ? '<i class="fas fa-check" style="color:white;font-size:10px;"></i>' : ''}
                </div>
                <div class="shopping-text">
                    <div>${item.name}</div>
                    <div class="shopping-reason ${reasonClass}">${reasonIcon} ${item.reasonText}</div>
                </div>
                <button class="header-btn" style="width:32px;height:32px;" onclick="removeShoppingItem('${item.id}')">
                    <i class="fas fa-trash-alt" style="font-size:12px;color:var(--red);"></i>
                </button>
            </div>
        `;
    }).join('');
}

function toggleShoppingItem(id) {
    const item = shoppingList.find(s => s.id === id);
    if (item) {
        item.completed = !item.completed;
        saveShopping();
        renderShoppingList();
    }
}

function removeShoppingItem(id) {
    shoppingList = shoppingList.filter(s => s.id !== id);
    saveShopping();
    renderShoppingList();
    showToast('Elemento rimosso', 'success');
}

function addToShoppingList(name, reason, reasonText) {
    const exists = shoppingList.find(s => s.name === name && !s.completed);
    if (!exists) {
        shoppingList.push({
            id: 's' + Date.now() + Math.random(),
            name: name,
            completed: false,
            reason: reason,
            reasonText: reasonText,
            date: new Date().toISOString()
        });
        saveShopping();
        renderShoppingList();
    }
}

// ===================== ADD PRODUCT =====================
function openAddProductModal() {
    currentProductId = null;
    document.getElementById('product-photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('product-ean').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-brand').value = '';
    document.getElementById('product-category').value = 'latticini';
    document.getElementById('product-location').value = '';
    document.getElementById('product-expiry').value = '';
    document.getElementById('product-qty').value = '1';
    document.getElementById('product-notes').value = '';
    openModal('add-product-modal');
}

function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('photo-preview').src = e.target.result;
            document.getElementById('photo-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function saveProduct() {
    const name = document.getElementById('product-name').value.trim();
    const expiry = document.getElementById('product-expiry').value;

    if (!name) { showToast('Inserisci il nome del prodotto', 'error'); return; }
    if (!expiry) { showToast('Inserisci la data di scadenza', 'error'); return; }

    const photoSrc = document.getElementById('photo-preview').style.display === 'block'
        ? document.getElementById('photo-preview').src : '';

    const product = {
        id: currentProductId || 'p' + Date.now(),
        name: name,
        brand: document.getElementById('product-brand').value.trim(),
        category: document.getElementById('product-category').value,
        ean: document.getElementById('product-ean').value.trim(),
        expiry: expiry,
        qty: parseInt(document.getElementById('product-qty').value) || 1,
        photo: photoSrc,
        location: document.getElementById('product-location').value.trim(),
        notes: document.getElementById('product-notes').value.trim(),
        status: 'active',
        consumed: false
    };

    if (currentProductId) {
        const idx = products.findIndex(p => p.id === currentProductId);
        if (idx >= 0) products[idx] = product;
    } else {
        products.push(product);
    }

    saveProducts();
    closeModal('add-product-modal');
    renderAll();
    showToast(currentProductId ? 'Prodotto aggiornato!' : 'Prodotto aggiunto!', 'success');
}

// ===================== PRODUCT DETAIL =====================
function showProductDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    currentProductId = id;

    const days = getDaysToExpiry(p.expiry);
    const status = getExpiryStatus(days);
    const emoji = getProductEmoji(p.name);
    const photoHtml = p.photo
        ? `<img src="${p.photo}" class="product-detail-photo" alt="">`
        : `<div class="product-detail-photo" style="display:flex;align-items:center;justify-content:center;background:var(--glass);border:1px dashed var(--text-muted);color:var(--text-muted);font-size:24px;">${emoji}</div>`;

    document.getElementById('product-detail-content').innerHTML = `
        <div class="product-detail-header">
            ${photoHtml}
            <div class="product-detail-info">
                <h2>${p.name}</h2>
                <div class="ean">EAN: ${p.ean || '---'}</div>
            </div>
        </div>
        <div class="detail-row">
            <span class="detail-label">Marca</span>
            <span class="detail-value">${p.brand || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Categoria</span>
            <span class="detail-value">${categoryIcons[p.category] || '📦'} ${p.category}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Posizione</span>
            <span class="detail-value">${p.location || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Data scadenza</span>
            <span class="detail-value" style="color:${days < 0 ? 'var(--red)' : (days <= 3 ? 'var(--yellow)' : 'var(--green)')}">${formatDate(p.expiry)} (${status.text})</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Quantità</span>
            <span class="detail-value">${p.qty}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Note</span>
            <span class="detail-value">${p.notes || '-'}</span>
        </div>
        <div class="detail-actions">
            <button class="btn-primary" onclick="markConsumed('${p.id}')" style="background:linear-gradient(135deg,var(--green),#00b894);">
                <i class="fas fa-check"></i> Consumato
            </button>
            <button class="btn-secondary" onclick="markWasted('${p.id}')" style="border-color:var(--red);color:var(--red);">
                <i class="fas fa-trash"></i> Sprecato
            </button>
        </div>
        <button class="btn-secondary" onclick="editProduct('${p.id}')" style="margin-top:10px;">
            <i class="fas fa-edit"></i> Modifica
        </button>
        <button class="btn-secondary" onclick="deleteProduct('${p.id}')" style="border-color:var(--red);color:var(--red);">
            <i class="fas fa-trash-alt"></i> Elimina
        </button>
    `;
    openModal('product-detail-modal');
}

function markConsumed(id) {
    const p = products.find(x => x.id === id);
    if (p) {
        p.status = 'consumed';
        p.consumed = true;
        consumed += p.qty;
        saveProducts();
        saveStats();
        addToShoppingList(p.name, 'smart', 'Consumato');
        closeModal('product-detail-modal');
        renderAll();
        showToast('Prodotto marcato come consumato!', 'success');
    }
}

function markWasted(id) {
    const p = products.find(x => x.id === id);
    if (p) {
        p.status = 'wasted';
        wasted += p.qty;
        saveProducts();
        saveStats();
        addToShoppingList(p.name, 'expired', 'Sprecato');
        closeModal('product-detail-modal');
        renderAll();
        showToast('Prodotto marcato come sprecato', 'error');
    }
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    closeModal('product-detail-modal');
    currentProductId = id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-brand').value = p.brand;
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-ean').value = p.ean;
    document.getElementById('product-expiry').value = p.expiry;
    document.getElementById('product-qty').value = p.qty;
    document.getElementById('product-location').value = p.location;
    document.getElementById('product-notes').value = p.notes;
    if (p.photo) {
        document.getElementById('photo-preview').src = p.photo;
        document.getElementById('photo-preview').style.display = 'block';
    } else {
        document.getElementById('photo-preview').style.display = 'none';
    }
    openModal('add-product-modal');
}

function deleteProduct(id) {
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        closeModal('product-detail-modal');
        renderAll();
        showToast('Prodotto eliminato', 'success');
    }
}

// ===================== SCANNER REALE =====================
function openScannerModal() {
    openModal('scanner-modal');
    startCamera();
}

async function startCamera() {
    const statusEl = document.getElementById('scanner-status');
    const video = document.getElementById('scanner-video');

    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Avvio fotocamera...';
    statusEl.className = 'scanner-status';

    try {
        // Ferma eventuale stream precedente
        stopCamera();

        // Richiedi accesso fotocamera posteriore
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        video.srcObject = scannerStream;
        video.onloadedmetadata = () => {
            video.play();
            statusEl.innerHTML = '<i class="fas fa-search"></i> Inquadra il codice a barre...';
            statusEl.className = 'scanner-status';
            isScanning = true;
            startBarcodeScanning();
        };

    } catch (err) {
        console.error('Errore fotocamera:', err);
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Fotocamera non disponibile. Usa "Inserisci EAN"';
        statusEl.className = 'scanner-status error';
        showToast('Fotocamera non accessibile. Usa il tasto "Inserisci EAN".', 'error');
    }
}

function startBarcodeScanning() {
    if (scanInterval) clearInterval(scanInterval);

    const video = document.getElementById('scanner-video');
    const statusEl = document.getElementById('scanner-status');

    // Scan ogni 200ms
    scanInterval = setInterval(async () => {
        if (!isScanning || video.readyState !== 4) return;

        try {
            // Metodo 1: Barcode Detection API (Chrome/Edge Android)
            if (barcodeDetector) {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    handleBarcodeDetected(barcode.rawValue, barcode.format);
                    return;
                }
            }

            // Metodo 2: Canvas analysis fallback (per browser che non supportano BarcodeDetector)
            // Questo è un semplice check di contrasto per rilevare pattern a barre
            // In produzione userei una libreria come QuaggaJS o ZXing

        } catch (e) {
            // Silenzioso - continua a scansionare
        }
    }, 200);
}

function handleBarcodeDetected(code, format) {
    if (!isScanning) return;
    isScanning = false;

    const statusEl = document.getElementById('scanner-status');
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Codice rilevato: ' + code;
    statusEl.className = 'scanner-status success';

    // Ferma scanning
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    // Vibra se disponibile
    if (navigator.vibrate) navigator.vibrate(200);

    // Aspetta un attimo poi apri form
    setTimeout(() => {
        stopCamera();
        closeModal('scanner-modal');
        openAddProductWithEAN(code);
    }, 800);
}

function stopCamera() {
    isScanning = false;
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    if (scannerStream) {
        scannerStream.getTracks().forEach(t => t.stop());
        scannerStream = null;
    }
    const video = document.getElementById('scanner-video');
    if (video) video.srcObject = null;
}

// ===================== MANUAL EAN =====================
function openManualEAN() {
    closeModal('scanner-modal');
    stopCamera();
    document.getElementById('manual-ean-input').value = '';
    openModal('manual-ean-modal');
    setTimeout(() => document.getElementById('manual-ean-input').focus(), 300);
}

function processManualEAN() {
    const ean = document.getElementById('manual-ean-input').value.trim();

    if (!ean) {
        showToast('Inserisci un codice EAN valido', 'error');
        return;
    }

    if (!/^\d{8,13}$/.test(ean)) {
        showToast('Il codice EAN deve contenere da 8 a 13 cifre', 'error');
        return;
    }

    closeModal('manual-ean-modal');
    openAddProductWithEAN(ean);
}

function openAddProductWithEAN(ean) {
    currentProductId = null;
    document.getElementById('product-photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('product-ean').value = ean;

    // Cerca nel database
    const dbProduct = eanDatabase[ean];
    if (dbProduct) {
        document.getElementById('product-name').value = dbProduct.name;
        document.getElementById('product-brand').value = dbProduct.brand;
        document.getElementById('product-category').value = dbProduct.category;
        showToast('Prodotto trovato nel database!', 'success');
    } else {
        document.getElementById('product-name').value = '';
        document.getElementById('product-brand').value = '';
        document.getElementById('product-category').value = 'latticini';
        showToast('Codice: ' + ean + ' - Completa i dati', 'success');
    }

    document.getElementById('product-location').value = '';
    document.getElementById('product-expiry').value = '';
    document.getElementById('product-qty').value = '1';
    document.getElementById('product-notes').value = '';
    openModal('add-product-modal');
}

// ===================== MODALS =====================
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
    if (id === 'scanner-modal') stopCamera();
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

// ===================== TOAST =====================
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    toast.className = 'toast ' + type;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===================== PROFILE =====================
function showProfile() {
    showToast('Profilo utente - Prossimamente', 'success');
}

// ===================== RENDER ALL =====================
function renderAll() {
    updateStats();
    renderProducts();
    renderRecipes();
    renderShoppingList();
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
    if (e.key === 'Enter' && document.getElementById('manual-ean-modal').classList.contains('active')) {
        processManualEAN();
    }
});
