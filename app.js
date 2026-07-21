var products = [];
var shoppingList = [];
var currentFilter = 'all';
var nextId = 1;
var nextListId = 1;
var selectedProductId = null;

// Stato fotocamera
var videoStream = null;
var currentTrack = null;

var categoryEmojis = {
  dairy: '&#129371;',
  meat: '&#129385;',
  produce: '&#129388;',
  pantry: '&#129387;',
  beverages: '&#129380;',
  frozen: '&#129482;'
};

var categoryNames = {
  dairy: 'Latticini',
  meat: 'Carne',
  produce: 'Verdura',
  pantry: 'Dispensa',
  beverages: 'Bevande',
  frozen: 'Surgelati'
};

var demoProducts = [
  { name: 'Latte Intero', emoji: '&#129371;', category: 'dairy', expiryDays: 4, qty: 2, barcode: '8001234567890' },
  { name: 'Mozzarella', emoji: '&#129472;', category: 'dairy', expiryDays: 2, qty: 1 },
  { name: 'Pomodori', emoji: '&#127813;', category: 'produce', expiryDays: 3, qty: 5 },
  { name: 'Pasta Barilla', emoji: '&#127837;', category: 'pantry', expiryDays: 180, qty: 3, barcode: '8076800195057' },
  { name: 'Petto di Pollo', emoji: '&#127831;', category: 'meat', expiryDays: 1, qty: 1 },
  { name: 'Yogurt Greco', emoji: '&#129379;', category: 'dairy', expiryDays: 7, qty: 4 },
  { name: 'Pane Integrale', emoji: '&#127838;', category: 'pantry', expiryDays: 5, qty: 1 },
  { name: 'Uova Bio', emoji: '&#129370;', category: 'dairy', expiryDays: 15, qty: 6 },
  { name: 'Insalata', emoji: '&#129388;', category: 'produce', expiryDays: 3, qty: 2 },
  { name: 'Olio EVO', emoji: '&#129746;', category: 'pantry', expiryDays: 365, qty: 1 },
  { name: 'Miele', emoji: '&#127855;', category: 'pantry', expiryDays: 730, qty: 1 },
  { name: 'Salmone', emoji: '&#128031;', category: 'meat', expiryDays: -1, qty: 1 },
];

var demoShopping = [
  { name: 'Latte Intero', checked: false, reason: 'Scade tra 4 giorni' },
  { name: 'Pane Integrale', checked: false, reason: 'Consumato' },
  { name: 'Uova Bio', checked: true, reason: 'Consumato' },
  { name: 'Caffe', checked: false, reason: 'Aggiunto manualmente' },
  { name: 'Detersivo piatti', checked: false, reason: 'Aggiunto manualmente' },
];

// ============================================================
// INIT
// ============================================================
function init() {
  var now = new Date();
  for (var i = 0; i < demoProducts.length; i++) {
    var p = demoProducts[i];
    var expiry = new Date(now);
    expiry.setDate(expiry.getDate() + p.expiryDays);
    products.push({
      id: nextId++,
      name: p.name,
      emoji: p.emoji,
      category: p.category,
      expiryDate: expiry.toISOString().split('T')[0],
      qty: p.qty,
      barcode: p.barcode || null,
      imageUrl: null,
      addedAt: now.toISOString().split('T')[0]
    });
  }

  for (var j = 0; j < demoShopping.length; j++) {
    var s = demoShopping[j];
    shoppingList.push({
      id: nextListId++,
      name: s.name,
      checked: s.checked,
      reason: s.reason
    });
  }

  renderProducts();
  renderShoppingList();
  updateStats();

  setTimeout(function() {
    var splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
  }, 1800);
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(screen) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
  }
  var navItems = document.querySelectorAll('.nav-item');
  for (var j = 0; j < navItems.length; j++) {
    navItems[j].classList.remove('active');
  }

  document.getElementById('screen-' + screen).classList.add('active');
  if (screen !== 'scanner') {
    document.getElementById('nav-' + screen).classList.add('active');
  }

  if (screen === 'list') {
    renderShoppingList();
  } else if (screen === 'pantry') {
    renderProducts();
    updateStats();
  }
}

// ============================================================
// FOTOCAMERA - IMPLEMENTAZIONE REALE
// ============================================================
function startScanner() {
  navigateTo('scanner');
  startCamera();
}

function startCamera() {
  var video = document.getElementById('camera-video');
  var frame = document.getElementById('scanner-frame');
  var hint = document.getElementById('scanner-hint');
  var actions = document.getElementById('scanner-actions');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Fotocamera non supportata su questo dispositivo');
    showManualInput();
    return;
  }

  var constraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
      videoStream = stream;
      video.srcObject = stream;
      currentTrack = stream.getVideoTracks()[0];

      // Mostra il video, nascondi overlay statico
      video.style.display = 'block';
      frame.style.borderColor = 'var(--primary)';
      hint.innerHTML = 'Inquadra il codice a barre<br>e premi il pulsante';
      actions.style.bottom = '40px';
    })
    .catch(function(err) {
      console.error('Errore fotocamera:', err);
      showToast('Impossibile accedere alla fotocamera');
      showManualInput();
    });
}

function stopCamera() {
  var video = document.getElementById('camera-video');

  if (videoStream) {
    var tracks = videoStream.getTracks();
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].stop();
    }
    videoStream = null;
  }

  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }

  currentTrack = null;
  closeScanResult();
}

function toggleTorch() {
  if (!currentTrack) {
    showToast('Torcia non disponibile');
    return;
  }

  var capabilities = currentTrack.getCapabilities();
  if (!capabilities.torch) {
    showToast('Torcia non supportata');
    return;
  }

  var settings = currentTrack.getSettings();
  var torchOn = settings.torch || false;

  currentTrack.applyConstraints({
    advanced: [{ torch: !torchOn }]
  }).then(function() {
    showToast(!torchOn ? 'Torcia accesa' : 'Torcia spenta');
  }).catch(function() {
    showToast('Errore torcia');
  });
}

function captureBarcode() {
  if (!videoStream) {
    showToast('Fotocamera non attiva');
    return;
  }

  var video = document.getElementById('camera-video');
  var canvas = document.getElementById('camera-canvas');
  var ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Per ora usiamo la simulazione con EAN demo
  // In futuro qui si integra una libreria barcode (es. QuaggaJS, ZXing)
  simulateBarcodeScan();
}

function showManualInput() {
  // Se la fotocamera non funziona, mostra input manuale
  var frame = document.getElementById('scanner-frame');
  var hint = document.getElementById('scanner-hint');
  if (frame) frame.style.display = 'none';
  if (hint) hint.innerHTML = 'Inserisci il codice manualmente<br>o usa la demo';
}

// ============================================================
// PRODUCTS
// ============================================================
function getDaysUntilExpiry(expiryDate) {
  var today = new Date();
  today.setHours(0,0,0,0);
  var exp = new Date(expiryDate);
  exp.setHours(0,0,0,0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function getStatusBadge(product) {
  var days = getDaysUntilExpiry(product.expiryDate);
  if (days < 0) return '<span class="expiry-badge danger">&#9940; Scaduto</span>';
  if (days === 0) return '<span class="expiry-badge danger">&#128308; Oggi</span>';
  if (days <= 3) return '<span class="expiry-badge warning">&#128993; ' + days + ' gg</span>';
  return '<span class="expiry-badge safe">&#128994; ' + days + ' gg</span>';
}

function renderProducts() {
  var list = document.getElementById('products-list');
  var filtered = [];
  for (var i = 0; i < products.length; i++) {
    filtered.push(products[i]);
  }

  if (currentFilter !== 'all') {
    if (currentFilter === 'expiring') {
      var temp = [];
      for (var k = 0; k < filtered.length; k++) {
        if (getDaysUntilExpiry(filtered[k].expiryDate) <= 3) {
          temp.push(filtered[k]);
        }
      }
      filtered = temp;
    } else {
      var temp2 = [];
      for (var m = 0; m < filtered.length; m++) {
        if (filtered[m].category === currentFilter) {
          temp2.push(filtered[m]);
        }
      }
      filtered = temp2;
    }
  }

  var searchTerm = document.getElementById('searchInput').value.toLowerCase();
  if (searchTerm) {
    var temp3 = [];
    for (var n = 0; n < filtered.length; n++) {
      if (filtered[n].name.toLowerCase().indexOf(searchTerm) !== -1) {
        temp3.push(filtered[n]);
      }
    }
    filtered = temp3;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128230;</div><div class="empty-state-title">Nessun prodotto</div><div class="empty-state-desc">Usa lo scanner per aggiungere il tuo primo prodotto!</div></div>';
    return;
  }

  var html = '';
  for (var idx = 0; idx < filtered.length; idx++) {
    var p = filtered[idx];
    var imgHtml = p.imageUrl ? '<img src="' + p.imageUrl + '" alt="' + p.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'' + p.emoji + '\'">' : p.emoji;
    html += '<div class="product-card" style="animation-delay:' + (idx * 0.03) + 's" onclick="openProductModal(' + p.id + ')">' +
      '<div class="product-img">' + imgHtml + '</div>' +
      '<div class="product-info">' +
        '<div class="product-name">' + p.name + '</div>' +
        '<div class="product-meta">' + getStatusBadge(p) + '<span>Scade: ' + formatDate(p.expiryDate) + '</span></div>' +
      '</div>' +
      '<div class="product-qty">' + p.qty + '</div>' +
    '</div>';
  }
  list.innerHTML = html;
}

function updateStats() {
  document.getElementById('stat-total').textContent = products.length;
  var warningCount = 0;
  var expiredCount = 0;
  for (var i = 0; i < products.length; i++) {
    var d = getDaysUntilExpiry(products[i].expiryDate);
    if (d >= 0 && d <= 3) warningCount++;
    if (d < 0) expiredCount++;
  }
  document.getElementById('stat-warning').textContent = warningCount;
  document.getElementById('stat-expired').textContent = expiredCount;
}

function filterProducts(category, chip) {
  currentFilter = category;
  var chips = document.querySelectorAll('.chip');
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove('active');
  }
  chip.classList.add('active');
  renderProducts();
}

// Search
document.getElementById('searchInput').addEventListener('input', function(e) {
  renderProducts();
});

// ============================================================
// PRODUCT MODAL
// ============================================================
function openProductModal(id) {
  selectedProductId = id;
  var product = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      product = products[i];
      break;
    }
  }
  if (!product) return;

  var days = getDaysUntilExpiry(product.expiryDate);
  var modalImg = document.getElementById('modal-img');

  if (product.imageUrl) {
    modalImg.innerHTML = '<img src="' + product.imageUrl + '" alt="' + product.name + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + product.emoji + '\'">';
  } else {
    modalImg.textContent = product.emoji;
  }

  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-sub').textContent = product.barcode ? 'EAN: ' + product.barcode : 'Prodotto manuale';
  document.getElementById('modal-badge').innerHTML = getStatusBadge(product);

  var catEmoji = categoryEmojis[product.category] || '&#128230;';
  var catName = categoryNames[product.category] || product.category;

  document.getElementById('modal-details').innerHTML =
    '<div class="detail-row"><span class="detail-label">Categoria</span><span class="detail-value">' + catEmoji + ' ' + catName + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Quantita</span><span class="detail-value">' + product.qty + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Data scadenza</span><span class="detail-value">' + formatDate(product.expiryDate) + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Giorni rimanenti</span><span class="detail-value">' + days + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Aggiunto il</span><span class="detail-value">' + formatDate(product.addedAt) + '</span></div>';

  document.getElementById('product-modal').classList.add('show');
}

function closeProductModal(e) {
  if (e.target === e.currentTarget) {
    document.getElementById('product-modal').classList.remove('show');
    selectedProductId = null;
  }
}

function deleteProduct() {
  if (selectedProductId === null) return;
  var p = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === selectedProductId) {
      p = products[i];
      break;
    }
  }
  var newProducts = [];
  for (var j = 0; j < products.length; j++) {
    if (products[j].id !== selectedProductId) {
      newProducts.push(products[j]);
    }
  }
  products = newProducts;
  document.getElementById('product-modal').classList.remove('show');
  renderProducts();
  updateStats();
  showToast('&#128465; ' + (p ? p.name : 'Prodotto') + ' rimosso');
  selectedProductId = null;
}

function consumeProduct() {
  if (selectedProductId === null) return;
  var p = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === selectedProductId) {
      p = products[i];
      break;
    }
  }
  if (p) {
    shoppingList.push({
      id: nextListId++,
      name: p.name,
      checked: false,
      reason: 'Consumato'
    });
  }
  document.getElementById('product-modal').classList.remove('show');
  showToast('&#128722; ' + (p ? p.name : 'Prodotto') + ' aggiunto alla lista spesa');
  selectedProductId = null;
}

// ============================================================
// SCANNER - OPEN FOOD FACTS + FOTOCAMERA
// ============================================================
var scannedProductData = null;
var currentBarcode = null;
var currentImageUrl = null;
var cameraPhotoData = null;

// EAN reali di test che funzionano con Open Food Facts
var realTestBarcodes = [
  '8076800195057',  // Barilla
  '8001250160432',  // Ferrero
  '8000500310428',  // Mulino Bianco
  '8001120973869',  // Parmalat
  '8005157501611',  // Galbani
  '8001505005592',  // Lavazza
  '8002270018187',  // Bauli
  '8000430139097',  // Cirio
  '8001665125301',  // De Cecco
  '8001120920306'   // Granarolo
];

function simulateBarcodeScan() {
  // Usa un EAN reale dalla lista di test
  var randomIndex = Math.floor(Math.random() * realTestBarcodes.length);
  currentBarcode = realTestBarcodes[randomIndex];
  processBarcode(currentBarcode);
}

function processBarcode(barcode) {
  closeScanResult();
  showToast('&#128269; Codice: ' + barcode);
  document.getElementById('api-loading').style.display = 'block';

  fetchProductFromOpenFoodFacts(barcode).then(function(productInfo) {
    document.getElementById('api-loading').style.display = 'none';

    if (productInfo.found && productInfo.imageUrl) {
      // Trovato con immagine
      currentImageUrl = productInfo.imageUrl;
      scannedProductData = {
        name: productInfo.name,
        emoji: categoryEmojis[productInfo.category] || '&#128230;',
        category: productInfo.category,
        sub: 'EAN: ' + barcode + (productInfo.brand ? ' &bull; ' + productInfo.brand : ''),
        expiry: 30
      };
      showScanResult(true);
    } else if (productInfo.found && !productInfo.imageUrl) {
      // Trovato senza immagine
      currentImageUrl = null;
      scannedProductData = {
        name: productInfo.name,
        emoji: categoryEmojis[productInfo.category] || '&#128230;',
        category: productInfo.category,
        sub: 'EAN: ' + barcode + (productInfo.brand ? ' &bull; ' + productInfo.brand : ''),
        expiry: 30
      };
      showScanResult(false);
    } else {
      // Non trovato - fallback demo
      var demoNames = [
        { name: 'Cereali Integrali', emoji: '&#129379;', cat: 'pantry', exp: 90 },
        { name: 'Salsa di Pomodoro', emoji: '&#127813;', cat: 'pantry', exp: 180 },
        { name: 'Biscotti al Cioccolato', emoji: '&#127850;', cat: 'pantry', exp: 60 },
        { name: 'Acqua Minerale', emoji: '&#128167;', cat: 'beverages', exp: 365 },
        { name: 'Tonno in Scatola', emoji: '&#128031;', cat: 'pantry', exp: 730 },
        { name: 'Marmellata', emoji: '&#127827;', cat: 'pantry', exp: 365 }
      ];
      var random = Math.floor(Math.random() * demoNames.length);
      var demo = demoNames[random];

      currentImageUrl = null;
      scannedProductData = {
        name: demo.name,
        emoji: demo.emoji,
        category: demo.cat,
        sub: 'EAN: ' + barcode,
        expiry: demo.exp
      };
      showScanResult(false);
    }
  });
}

function fetchProductFromOpenFoodFacts(barcode) {
  return new Promise(function(resolve) {
    fetch('https://world.openfoodfacts.org/api/v0/product/' + barcode + '.json')
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 1 && data.product) {
          var product = data.product;
          resolve({
            found: true,
            name: product.product_name || product.product_name_it || 'Prodotto sconosciuto',
            imageUrl: product.image_url || product.image_front_url || null,
            category: detectCategory(product),
            brand: product.brands || '',
            quantity: product.quantity || ''
          });
        } else {
          resolve({ found: false });
        }
      })
      .catch(function(error) {
        console.error('Errore fetch:', error);
        resolve({ found: false });
      });
  });
}

function detectCategory(product) {
  var cats = (product.categories || '').toLowerCase();
  var labels = (product.labels || '').toLowerCase();
  var allText = cats + ' ' + labels;

  if (allText.indexOf('latte') !== -1 || allText.indexOf('formaggio') !== -1 || allText.indexOf('yogurt') !== -1 || allText.indexOf('latticino') !== -1 || allText.indexOf('dairy') !== -1 || allText.indexOf('uovo') !== -1) return 'dairy';
  if (allText.indexOf('carne') !== -1 || allText.indexOf('pesce') !== -1 || allText.indexOf('pollo') !== -1 || allText.indexOf('salmone') !== -1 || allText.indexOf('meat') !== -1 || allText.indexOf('fish') !== -1) return 'meat';
  if (allText.indexOf('verdura') !== -1 || allText.indexOf('frutta') !== -1 || allText.indexOf('insalata') !== -1 || allText.indexOf('pomodoro') !== -1 || allText.indexOf('vegetable') !== -1 || allText.indexOf('fruit') !== -1) return 'produce';
  if (allText.indexOf('bevanda') !== -1 || allText.indexOf('bibita') !== -1 || allText.indexOf('vino') !== -1 || allText.indexOf('beverage') !== -1 || allText.indexOf('drink') !== -1) return 'beverages';
  if (allText.indexOf('surgelato') !== -1 || allText.indexOf('congelato') !== -1 || allText.indexOf('frozen') !== -1) return 'frozen';
  return 'pantry';
}

function showScanResult(hasImage) {
  var resultImg = document.getElementById('result-img');
  var resultTitle = document.getElementById('result-title');
  var resultSub = document.getElementById('result-sub');
  var nameInput = document.getElementById('product-name-input');
  var expiryInput = document.getElementById('expiry-input');
  var qtyInput = document.getElementById('qty-input');
  var btnCamera = document.getElementById('btn-camera');
  var cameraPreview = document.getElementById('camera-preview');

  cameraPreview.classList.remove('show');
  cameraPreview.src = '';
  cameraPhotoData = null;

  if (hasImage && currentImageUrl) {
    resultImg.innerHTML = '<img src="' + currentImageUrl + '" alt="' + scannedProductData.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<span class=placeholder-text>' + scannedProductData.emoji + '</span>\'">';
  } else {
    resultImg.innerHTML = '<span class="placeholder-text">' + scannedProductData.emoji + '</span>';
  }

  resultTitle.textContent = scannedProductData.name;
  resultSub.innerHTML = scannedProductData.sub;

  nameInput.value = scannedProductData.name;

  var expiry = new Date();
  expiry.setDate(expiry.getDate() + scannedProductData.expiry);
  expiryInput.value = expiry.toISOString().split('T')[0];
  qtyInput.value = '1';

  if (!hasImage) {
    btnCamera.style.display = 'block';
  } else {
    btnCamera.style.display = 'none';
  }

  document.getElementById('scan-result').classList.add('show');
}

function closeScanResult() {
  document.getElementById('scan-result').classList.remove('show');
  scannedProductData = null;
  currentBarcode = null;
  currentImageUrl = null;
  cameraPhotoData = null;
}

function openCamera() {
  document.getElementById('camera-input').click();
}

function handleCameraPhoto(event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    cameraPhotoData = e.target.result;
    var preview = document.getElementById('camera-preview');
    preview.src = cameraPhotoData;
    preview.classList.add('show');

    var resultImg = document.getElementById('result-img');
    resultImg.innerHTML = '<img src="' + cameraPhotoData + '" alt="Foto prodotto">';

    showToast('&#128247; Foto aggiunta!');
  };
  reader.readAsDataURL(file);

  event.target.value = '';
}

function addProduct() {
  if (!scannedProductData) return;

  var name = document.getElementById('product-name-input').value.trim();
  var expiry = document.getElementById('expiry-input').value;
  var qty = parseInt(document.getElementById('qty-input').value) || 1;

  if (!name) {
    showToast('&#9888;&#65039; Inserisci il nome del prodotto');
    return;
  }

  var finalImageUrl = cameraPhotoData || currentImageUrl || null;

  products.unshift({
    id: nextId++,
    name: name,
    emoji: scannedProductData.emoji,
    category: scannedProductData.category || 'pantry',
    expiryDate: expiry,
    qty: qty,
    barcode: currentBarcode,
    imageUrl: finalImageUrl,
    addedAt: new Date().toISOString().split('T')[0]
  });

  closeScanResult();
  stopCamera();
  navigateTo('pantry');
  renderProducts();
  updateStats();
  showToast('&#9989; ' + name + ' aggiunto!');
}

// ============================================================
// SHOPPING LIST
// ============================================================
function renderShoppingList() {
  var list = document.getElementById('shopping-list');
  var total = shoppingList.length;
  var checked = 0;
  for (var i = 0; i < shoppingList.length; i++) {
    if (shoppingList[i].checked) checked++;
  }
  var pct = total === 0 ? 0 : Math.round((checked / total) * 100);

  document.getElementById('progress-text').textContent = checked + '/' + total + ' completati';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-bar').style.width = pct + '%';

  if (total === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128722;</div><div class="empty-state-title">Lista vuota</div><div class="empty-state-desc">I prodotti consumati o scaduti appariranno qui automaticamente.</div></div>';
    return;
  }

  var html = '';
  for (var idx = 0; idx < shoppingList.length; idx++) {
    var item = shoppingList[idx];
    html += '<div class="list-item" style="animation-delay:' + (idx * 0.03) + 's">' +
      '<div class="checkbox ' + (item.checked ? 'checked' : '') + '" onclick="toggleCheck(' + item.id + ')"></div>' +
      '<div style="flex:1">' +
        '<div class="list-item-text ' + (item.checked ? 'checked' : '') + '">' + item.name + '</div>' +
        '<div class="list-item-reason">&#129302; ' + item.reason + '</div>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = html;
}

function toggleCheck(id) {
  for (var i = 0; i < shoppingList.length; i++) {
    if (shoppingList[i].id === id) {
      shoppingList[i].checked = !shoppingList[i].checked;
      break;
    }
  }
  renderShoppingList();
}

function addListItem() {
  var input = document.getElementById('newItemInput');
  var name = input.value.trim();
  if (!name) return;
  shoppingList.push({
    id: nextListId++,
    name: name,
    checked: false,
    reason: 'Aggiunto manualmente'
  });
  input.value = '';
  renderShoppingList();
  showToast('&#9989; ' + name + ' aggiunto');
}

document.getElementById('newItemInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') addListItem();
});

// ============================================================
// UTILS
// ============================================================
function formatDate(dateStr) {
  var d = new Date(dateStr);
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function showToast(msg) {
  var toast = document.getElementById('toast');
  toast.innerHTML = msg;
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
  }, 2500);
}

// Inizializzazione
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
