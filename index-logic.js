// index-logic.js (CORREGIDO)

document.addEventListener('DOMContentLoaded', () => {
    const packsContainer = document.getElementById('packs-container');

    // Función principal para cargar y renderizar los packs
    async function loadAndRenderPacks() {
        let packsData = [];

        try {
            // 1. Cargar packs.json de forma asíncrona
            const response = await fetch('./packs.json'); 
            
            if (!response.ok) {
                // Si la respuesta HTTP no es exitosa (ej. 404, 500)
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 2. Extraer el array de packs (asumiendo que está en data.packs)
            if (data && Array.isArray(data.packs)) {
                packsData = data.packs;
            } else {
                throw new Error("Estructura de packs.json incorrecta. Se esperaba un array en la clave 'packs'.");
            }

        } catch (error) {
            console.error("❌ Error al cargar los packs logísticos:", error);
            // Muestra un mensaje de error visible en el contenedor
            packsContainer.innerHTML = `
                <p style="color: #cc0000; font-weight: bold;">
                    Error de carga: No se pudieron obtener los datos de packs. Por favor, verifica el archivo packs.json.
                </p>`;
            return; // Detiene la ejecución si hay error
        }
        
        // 3. Renderizar las tarjetas de packs
        packsData.forEach(pack => {
            // Crear el elemento de la tarjeta (el cuadrado)
            const packCard = document.createElement('div');
            packCard.className = 'pack-card';
            packCard.textContent = pack.nombre;
            
            // Almacenar el ID del pack en el elemento
            packCard.dataset.packId = pack.id; 

            // Asignar el evento click para la redirección
            packCard.addEventListener('click', () => {
                // Redirigir a la página de checklist, pasando el ID como parámetro de URL
                // El ID se usa en checklist-logic.js para cargar los ítems específicos.
                window.location.href = `checklist.html?packId=${pack.id}`;
            });

            packsContainer.appendChild(packCard);
        });
    }

    // Ejecutar la función de carga
    loadAndRenderPacks();
});