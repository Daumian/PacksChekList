setTimeout(() => {
    itemElement.remove(); 
    
    // Ahora itemsPendientes ya refleja el valor correcto.
    if (itemsPendientes <= 0) { 
        mostrarPackCompleto();
    }
}, 200);
