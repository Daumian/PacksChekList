// checklist-logic.js

let itemsPendientes = 0; 
let packItems = []; 
let verifiedIndices = new Set(); 
let currentPackId = ''; 

// --- Lógica de Persistencia de Estado (URL) ---
function updateUrlState() {
    // ... (sin cambios, ya que solo persiste el índice principal)
    const verifiedString = Array.from(verifiedIndices).sort((a, b) => a - b).join(',');
    const newUrl = new URL(window.location.href);
    
    if (verifiedString) {
        newUrl.searchParams.set('v', verifiedString);
    } else {
        newUrl.searchParams.delete('v');
    }
    
    window.history.replaceState({}, '', newUrl.href);
}

function getVerifiedFromUrl(params) {
    // ... (sin cambios)
    const verifiedParam = params.get('v');
    if (!verifiedParam) {
        return new Set();
    }
    return new Set(
        verifiedParam.split(',')
            .map(index => parseInt(index.trim(), 10))
            .filter(n => !isNaN(n))
    );
}

// --- Lógica Auxiliar de Grupos ---

/**
 * Verifica si todos los sub-ítems dentro de un grupo están marcados.
 * @param {object} itemGroup - El objeto del grupo (ej: Guantes)
 * @returns {boolean} True si todos los sub-ítems están 'verificado: true'.
 */
function checkGroupComplete(itemGroup) {
    // Si el grupo no tiene ítems, se considera completo
    if (!itemGroup.items || itemGroup.items.length === 0) return true;
    
    // Si algún ítem no está verificado, retorna false
    return itemGroup.items.every(subItem => subItem.verificado === true);
}



// --- Pegada a huevo ---

function mostrarPackCompleto() {
    const message = document.getElementById('complete-message');
    message.style.display = 'block'; 

    setTimeout(() => {
        // Al finalizar, borramos el estado de la URL antes de redirigir
        window.history.replaceState({}, '', `index.html`); 
        window.location.href = 'index.html';
    }, 2000); 
}






// --- Lógica de Verificación PRINCIPAL ---

function verificarItem(event) {
    const target = event.currentTarget;
    
    // Identificar si el clic vino del checkbox del grupo padre o de un sub-ítem
    const itemIndex = parseInt(target.closest('li[data-index]').dataset.index, 10);
    const itemElement = target.closest('li[data-index]');
    
    // Obtener el objeto del ítem principal (sea grupo o simple)
    const packItem = packItems[itemIndex];
    
    if (!packItem) return;

    // A) Clic en el ÍTEM SIMPLE O EL CHECKBOX DEL GRUPO PADRE
    if (target.classList.contains('checkbox')) {
        
        // Clic en el checkbox de ÍTEM SIMPLE
        if (!packItem.esGrupo) {
            if (verifiedIndices.has(itemIndex)) return;
            verifiedIndices.add(itemIndex);
        
        // Clic en el checkbox del GRUPO PADRE
        } else {
            if (verifiedIndices.has(itemIndex)) return;
            
            // Marcar todos los sub-ítems como verificados en la memoria
            packItem.items.forEach(sub => sub.verificado = true);
            verifiedIndices.add(itemIndex); // Marcar el índice principal como verificado
        }
        
        // 🔑 CORRECCIÓN: Decrementar inmediatamente para que el contador sea correcto en el setTimeout.
        itemsPendientes--; 

        // Iniciar la eliminación del DOM
        updateUrlState(); 
        itemElement.classList.add('verificado');

        setTimeout(() => {
            itemElement.remove(); 
            
            // Ahora itemsPendientes ya refleja el valor correcto (0 si es el último)
            if (itemsPendientes <= 0) { 
                mostrarPackCompleto();
            }
        }, 200);
        
        return; 
    }

    // B) Clic en el SUB-ÍTEM dentro de un grupo
    if (packItem.esGrupo && target.classList.contains('subitem-entry')) {
        
        // 1. Obtener el ID del sub-ítem clicado
        const subItemId = target.dataset.subid;
        const subItem = packItem.items.find(sub => sub.id === subItemId);
        
        if (!subItem || subItem.verificado) return;

        // 2. Marcar el sub-ítem en la memoria y en el DOM
        subItem.verificado = true;
        target.classList.add('subitem-verificado');
        
        // 3. Verificar si el GRUPO COMPLETO ya está listo
        if (checkGroupComplete(packItem)) {
            
            // Si el grupo está completo, se comporta como si hubiéramos clickeado el padre
            verifiedIndices.add(itemIndex);
            updateUrlState();
            
            // 🔑 CORRECCIÓN: Decrementar inmediatamente para que el contador sea correcto en el setTimeout.
            itemsPendientes--; 

            // Aplicar la transición al elemento padre <li>
            itemElement.classList.add('verificado'); 
            
            setTimeout(() => {
                itemElement.remove();
                
                if (itemsPendientes <= 0) {
                    mostrarPackCompleto();
                }
            }, 200);
        }
    }
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
    // CLONAR el array para poder modificar el estado 'verificado' de los sub-ítems en memoria
    packItems = JSON.parse(JSON.stringify(packSeleccionado.items)); 
    verifiedIndices = verifiedIndicesSet; 

    document.getElementById('pack-name').textContent = packSeleccionado.nombre;
    const checklistList = document.getElementById('checklist-list');
    
    checklistList.innerHTML = '';
    
    packItems.forEach((item, index) => {
        // Si el índice principal ya está en la URL, NO renderizamos
        if (verifiedIndices.has(index)) {
            return;
        }

        const listItem = document.createElement('li');
        listItem.dataset.index = index; 
        
        // --- LÓGICA DE GRUPO ---
        if (item.esGrupo === true && Array.isArray(item.items)) { 
            listItem.className = 'checklist-group';
            
            // Header con el checkbox para verificación rápida
            listItem.innerHTML = `
                <div class="group-header">
                    <div class="checkbox"></div>
                    <span class="group-name">${item.nombre}</span>
                </div>
                <ul class="subitems-list"></ul>
            `;
            
            const subitemsList = listItem.querySelector('.subitems-list');
            
            // Renderizar los sub-ítems
            item.items.forEach((subItem, subIndex) => {
                // Generar un ID simple temporal para el sub-ítem si no tiene uno (RECOMENDADO)
                const subItemId = `sub-${index}-${subIndex}`;
                subItem.id = subItemId; // Asegurar que el objeto en memoria tiene el ID
                
                const subListItem = document.createElement('li');
                // IMPORTANTE: El listener se adjunta a subListItem
                subListItem.className = 'subitem-entry'; 
                subListItem.dataset.subid = subItemId; // Usar ID para rastrear el clic
                
                const unidad = subItem.unidad ? ' ' + subItem.unidad : '';
                const cantidad = `${subItem.cantidad}${unidad}`;
                
                subListItem.innerHTML = `
                    <span class="subitem-name">${subItem.nombre}</span>
                    <span class="subitem-quantity">${cantidad}</span>
                `;
                
                // ASIGNAR EL LISTENER AL SUB-ÍTEM
                subListItem.addEventListener('click', verificarItem);

                subitemsList.appendChild(subListItem);
            });

            // Asignar el evento CLICK solo al cuadradito del GRUPO PADRE
            const checkboxElement = listItem.querySelector('.checkbox'); 
            checkboxElement.addEventListener('click', verificarItem);

            checklistList.appendChild(listItem);
            itemsPendientes++;

        } else {
            // --- LÓGICA DE ÍTEM SIMPLE ---
            listItem.className = 'checklist-item';
            
            const unidad = item.unidad ? ' ' + item.unidad : '';
            const cantidad = `${item.cantidad}${unidad}`;

            listItem.innerHTML = `
                <div class="checkbox"></div>
                <div class="item-info">
                    <span class="item-name">${item.nombre}</span>
                </div>
                <span class="item-quantity">${cantidad}</span>
            `;

            // Asignar el evento CLICK solo al elemento 'checkbox'
            const checkboxElement = listItem.querySelector('.checkbox'); 
            checkboxElement.addEventListener('click', verificarItem);

            checklistList.appendChild(listItem);
            itemsPendientes++; 
        }
    });
    
    if (itemsPendientes === 0 && packItems.length > 0) {
        mostrarPackCompleto();
    }
}

let globalPacksData = []; 

document.addEventListener('DOMContentLoaded', async () => {
    // ... (El resto del código de carga no cambia)
    const params = new URLSearchParams(window.location.search);
    const packId = params.get('packId');
    
    if (!packId) {
        alert("Error: Pack no especificado. Volviendo al inicio.");
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('./packs.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && Array.isArray(data.packs)) {
            globalPacksData = data.packs;
            
            const verifiedIndicesFromUrl = getVerifiedFromUrl(params);

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