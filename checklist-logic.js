// checklist-logic.js

let itemsPendientes = 0; 
let packItems = []; // Almacena el array original de ítems del pack
let verifiedIndices = new Set(); // Conjunto para rastrear índices verificados (v.g., {0, 3, 5})
let currentPackId = ''; // ID del pack actual

// --- Lógica de Persistencia de Estado (URL) ---

// 1. CODIFICAR: Convierte el Set de índices verificados en un string de URL (ej: "0,2,5")
function updateUrlState() {
    // Convierte el Set a un array, lo ordena y lo une con comas
    const verifiedString = Array.from(verifiedIndices).sort((a, b) => a - b).join(',');
    
    const newUrl = new URL(window.location.href);
    
    // Si hay ítems verificados, añádelos; si no, quita el parámetro 'v'
    if (verifiedString) {
        newUrl.searchParams.set('v', verifiedString);
    } else {
        newUrl.searchParams.delete('v');
    }
    
    // Usa history.replaceState para actualizar la URL sin recargar la página
    window.history.replaceState({}, '', newUrl.href);
}

// 2. DECODIFICAR: Lee el string de URL y lo convierte en un Set de índices
function getVerifiedFromUrl(params) {
    const verifiedParam = params.get('v');
    if (!verifiedParam) {
        return new Set();
    }
    // Divide la cadena (ej: "0,2,5"), la convierte a números y la retorna como Set
    return new Set(
        verifiedParam.split(',')
            .map(index => parseInt(index.trim(), 10))
            .filter(n => !isNaN(n))
    );
}

// --- Lógica de Verificación ---

function verificarItem(event) {
    const itemElement = event.currentTarget; 
    const itemIndex = parseInt(itemElement.dataset.index, 10); // Obtener el índice del ítem

    if (verifiedIndices.has(itemIndex)) return; // Evitar doble verificación

    // 1. Añadir al estado y actualizar la URL
    verifiedIndices.add(itemIndex);
    updateUrlState(); 

    // 2. Aplicar la transición visual
    itemElement.classList.add('verificado');
    itemElement.removeEventListener('click', verificarItem); // Deshabilitar clic

    // 3. Decrementar y eliminar después de la transición (0.1s)
    setTimeout(() => {
        itemElement.remove(); 
        itemsPendientes--;
        
        // 4. Finalización
        if (itemsPendientes <= 0) {
            mostrarPackCompleto();
        }
    }, 200); 
}

function mostrarPackCompleto() {
    const message = document.getElementById('complete-message');
    message.style.display = 'block'; 

    setTimeout(() => {
        // Al finalizar, borramos el estado de la URL antes de redirigir
        window.history.replaceState({}, '', `index.html`); 
        window.location.href = 'index.html';
    }, 2000); 
}

// --- Inicialización ---

function initChecklist(packId, verifiedIndicesSet) {
    const packSeleccionado = globalPacksData.find(p => p.id === packId);

    if (!packSeleccionado) {
        alert("Error: El Pack ID no existe. Volviendo al inicio.");
        window.location.href = 'index.html';
        return;
    }
    
    currentPackId = packId;
    packItems = packSeleccionado.items; // Guardar la lista completa
    verifiedIndices = verifiedIndicesSet; // Cargar el estado desde la URL

    document.getElementById('pack-name').textContent = packSeleccionado.nombre;
    const checklistList = document.getElementById('checklist-list');
    
    // Generar la lista completa
    packItems.forEach((item, index) => {
        // Solo renderizar ítems que NO han sido verificados previamente
        if (verifiedIndices.has(index)) {
            // Si está verificado, simplemente no lo contamos ni lo añadimos al DOM
            return;
        }

        const listItem = document.createElement('li');
        listItem.className = 'checklist-item';
        listItem.dataset.index = index; // Clave para la persistencia
        
        // Formatear la cantidad (ejemplo: x5 unidades)
        const cantidad = `${item.cantidad} ${item.unidad || ''}`;

        listItem.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.nombre}</span>
            </div>
            <span class="item-quantity">${cantidad}</span>
        `;
        
        listItem.addEventListener('click', verificarItem);
        
        checklistList.appendChild(listItem);
        itemsPendientes++; // Contar solo los ítems que se renderizan
    });
    
    // Si no quedan ítems (porque todos fueron verificados por URL), terminar
    if (itemsPendientes === 0 && packItems.length > 0) {
        mostrarPackCompleto();
    }
}

// Variable global para almacenar los datos cargados de packs.json
let globalPacksData = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const packId = params.get('packId');
    
    if (!packId) {
        alert("Error: Pack no especificado. Volviendo al inicio.");
        window.location.href = 'index.html';
        return;
    }

    try {
        // Cargar packs.json (asíncrono)
        const response = await fetch('./packs.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && Array.isArray(data.packs)) {
            globalPacksData = data.packs;
            
            // 1. Decodificar el estado de verificación de la URL
            const verifiedIndicesFromUrl = getVerifiedFromUrl(params);

            // 2. Inicializar la lista con el pack ID y los índices verificados
            initChecklist(packId, verifiedIndicesFromUrl);
        } else {
            throw new Error("Estructura de packs.json incorrecta.");
        }

    } catch (error) {
        console.error("❌ Error al cargar los datos en el checklist:", error);
        document.getElementById('pack-name').textContent = "ERROR: No se pudieron cargar los datos.";
        setTimeout(() => window.location.href = 'index.html', 3000);
    }
});