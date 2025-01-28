// script.js
const statusElement = document.getElementById('status');
const scanButton = document.getElementById('scanButton');
const registerButton = document.getElementById('registerButton');
const buscarButton = document.getElementById('buscarButton');
const registerContainer = document.getElementById('registerContainer');
const buscarContainer = document.getElementById('buscarContainer');
const loadingOverlay = document.getElementById('loadingOverlay');

// Register Form Elements
const registerForm = {
    container: registerContainer,
    nameInput: document.getElementById('registerName'),
    phoneInput: document.getElementById('registerPhone'),
    emailInput: document.getElementById('registerEmail'),
    direccionInput: document.getElementById('registerDireccion'),
    descuentoInput: document.getElementById('registerDescuento'),
    okButton: document.getElementById('registerOkButton')
};

// Buscar Form Elements
const buscarForm = {
    container: buscarContainer,
    nameInput: document.getElementById('buscarName'),
    phoneInput: document.getElementById('buscarPhone'),
    emailInput: document.getElementById('buscarEmail'),
    okButton: document.getElementById('buscarOkButton')
};

// Info Block Elements
const infoElements = {
    currentName: document.getElementById('currentName'),
    currentPhone: document.getElementById('currentPhone'),
    currentEmail: document.getElementById('currentEmail'),
    currentAdress: document.getElementById('currentadress'),
    currentDiscount: document.getElementById('currentDiscount'),
    currentSerial: document.getElementById('currentSerial'),
    currentTimestamp: document.getElementById('currentTimestamp'),
    currentclasificacion: document.getElementById('currentclasificacion'),
    currentPuntos: document.getElementById('currentPuntos'),
    currentvisitas: document.getElementById('currentvisitas'),
    currentnumerocliente: document.getElementById('currentnumerocliente')
};

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = 'status ' + (isError ? 'error' : 'success');
}

function updateInfoBlock(data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        for (const key in infoElements) {
            const element = infoElements[key];
            const dataKey = key.replace('current', '').toLowerCase(); // e.g., 'currentName' -> 'name'
            element.textContent = parsedData[dataKey] || '-';
        }
    } catch (error) {
        console.error('Error updating info block:', error);
        updateStatus('Error displaying data.', true);
    }
}

function checkNFCAvailability() {
    if (!('NDEFReader' in window)) {
        scanButton.disabled = true;
        registerButton.disabled = true;
        buscarButton.disabled = true;
        updateStatus('NFC not supported.', true);
        return false;
    }
    return true;
}

function toggleForm(form) {
    form.container.classList.toggle('visible');
    if (form === registerForm && buscarForm.container.classList.contains('visible')) {
        buscarForm.container.classList.remove('visible');
    } else if (form === buscarForm && registerForm.container.classList.contains('visible')) {
        registerForm.container.classList.remove('visible');
    }
}

registerButton.addEventListener('click', () => toggleForm(registerForm));
buscarButton.addEventListener('click', () => toggleForm(buscarForm));

// Function to handle form submission (Register and Buscar are similar)
async function submitForm(formType, formData) {
    const action = formType === 'register' ? 'registrarCLIENTE' : 'buscarCLIENTE';
    const url = new URL('https://n8n-n8n.dlyqti.easypanel.host/webhook/fab43c1a-ef5d-43d8-ae52-3e2d891496dd');
    url.searchParams.append('text', `${action} ${JSON.stringify(formData)}`);

    try {
        showLoading(); // Show loading overlay
        updateStatus(`${formType === 'register' ? 'Registrando cliente' : 'Buscando cliente'}, por favor espere...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        const responseText = await response.text();
        const jsonMatch = responseText.match(/\{[^]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid data in response');
        }
        const clientData = JSON.parse(jsonMatch[0]);
        updateInfoBlock(clientData);
        updateStatus(`${formType === 'register' ? 'Cliente registrado' : 'Cliente encontrado'} correctamente.`, false);
        if (formType === 'register') {
            setTimeout(() => { // Clear form after registration
                registerForm.nameInput.value = '';
                registerForm.phoneInput.value = '';
                registerForm.emailInput.value = '';
                registerForm.direccionInput.value = '';
                registerForm.descuentoInput.value = '';
                registerForm.container.classList.remove('visible');
                updateStatus('');
            }, 3000);
        }
    } catch (error) {
        console.error(`${formType} error:`, error);
        updateStatus(`Failed to ${formType === 'register' ? 'register' : 'search'}. Try again.`, true);
    } finally {
        hideLoading(); // Hide loading overlay in any case
    }
}


registerForm.okButton.addEventListener('click', async () => {
    const name = registerForm.nameInput.value.trim();
    const phone = registerForm.phoneInput.value.trim();
    const email = registerForm.emailInput.value.trim();
    const direccion = registerForm.direccionInput.value.trim();
    const descuento = registerForm.descuentoInput.value.trim();

    if (!name || !phone || !email || !direccion || !descuento) {
        updateStatus('Please fill all fields', true);
        return;
    }

    const userData = { name, phone, email, direccion, descuento };

    try {
        updateStatus('Approach NFC tag to write...');
        const ndef = new NDEFReader();
        await ndef.scan();

        ndef.addEventListener("reading", async () => {
            try {
                await ndef.write({
                    records: [{ recordType: "text", data: JSON.stringify(userData) }]
                });
                await submitForm('register', userData); // Submit data to webhook
                updateStatus('Client data written to NFC tag ✓');
                if ('vibrate' in navigator) { navigator.vibrate(200); }
            } catch (error) {
                console.error('Write error:', error);
                updateStatus('Error writing to NFC tag', true);
            } finally {
                ndef.close();
            }
        });
    } catch (error) {
        console.error('NFC register error:', error);
        handleNFCError(error);
    }
});


buscarForm.okButton.addEventListener('click', async () => {
    const name = buscarForm.nameInput.value.trim();
    const phone = buscarForm.phoneInput.value.trim();
    const email = buscarForm.emailInput.value.trim();

    if (!name && !phone && !email) {
        updateStatus('Fill at least one search field', true);
        return;
    }

    const searchData = { name, phone, email };
    await submitForm('buscar', searchData);
});


async function startNFCScan() {
    if (!checkNFCAvailability()) return;

    try {
        updateStatus('Initiating NFC scan...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UI feedback
        const ndef = new NDEFReader();
        await ndef.scan();
        updateStatus('Approach NFC tag...');

        ndef.addEventListener("reading", async ({ message, serialNumber }) => {
            try {
                const record = message.records[0];
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(record.data);
                const timestamp = new Date().toISOString();
                const data = { text, serialNumber, timestamp };

                updateInfoBlock(data); // Update UI immediately with NFC data

                showLoading(); // Show loading overlay while waiting for webhook
                updateStatus('Updating data from server...');

                const url = new URL('https://n8n-n8n.dlyqti.easypanel.host/webhook/fab43c1a-ef5d-43d8-ae52-3e2d891496dd');
                url.searchParams.append('text', 'actualizarCLIENTE ' + text);
                url.searchParams.append('serialNumber', serialNumber);
                url.searchParams.append('timestamp', timestamp);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                const clientData = await response.json(); // Expecting JSON response now!

                updateInfoBlock(clientData); // Update UI with data from webhook
                updateStatus(`Data updated successfully`, false);
                if ('vibrate' in navigator) { navigator.vibrate(200); }

            } catch (error) {
                console.error('NFC reading error:', error);
                updateStatus('Error reading NFC tag data', true);
            } finally {
                ndef.close();
                hideLoading(); // Hide loading overlay after webhook response (or error)
            }
        });

    } catch (error) {
        console.error('NFC start scan error:', error);
        handleNFCError(error);
    }
}

function handleNFCError(error) {
    if (error.name === 'NotAllowedError') {
        updateStatus('Enable NFC and allow site access', true);
    } else if (error.name === 'NotReadableError') {
        updateStatus('Could not read NFC tag', true);
    } else {
        updateStatus('Error starting NFC reader', true);
    }
    hideLoading(); // Ensure loading overlay is hidden on error
}


scanButton.addEventListener('click', startNFCScan);

checkNFCAvailability();