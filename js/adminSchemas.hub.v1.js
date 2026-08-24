// Agrega la casilla "Hub" al editor de owner.
//
// Es un parche en runtime, no una edicion de js/adminSchemas.js: ese archivo ya
// existe en el CDN con cache inmutable y los cambios nunca llegarian
// (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2). admin.js lee window.AdminSchemas en el
// momento de abrir el formulario, asi que basta con empujar el campo despues.
//
// Requisito previo: la columna booleana `Hub` tiene que existir en las tablas
// Proyectos y ProyectosJuegos del workspace. Mientras no exista, el hub de la
// portada se oculta solo (ver js/hub.v1.js) y esta casilla no se puede guardar.
(function () {
    const CAMPO = {
        nombre: "Hub",
        tipo: "bool",
        etiqueta: { en: "Show in hub", es: "Mostrar en el hub" },
        ayuda: {
            en: "Lists this row in the workspace hub on the front page.",
            es: "Lista esta fila en el hub del espacio de trabajo, en la portada."
        }
    };

    function agregar(clave) {
        const esquema = window.AdminSchemas?.[clave];
        if (!esquema) return;
        if (esquema.campos.some(c => c.nombre === CAMPO.nombre)) return;
        esquema.campos.push({ ...CAMPO });
    }

    agregar("Proyectos");
    agregar("ProyectosJuegos");
})();
