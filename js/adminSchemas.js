// Definiciones de campos por entidad. El editor de admin.js se construye a
// partir de esto, asi que agregar un campo editable es agregar una linea aqui.
//
// tipo: text | longtext | markdown | bool | int | date | status | relation
// i18n: true  -> el campo tiene variante EN (Campo / CampoEN) y se editan ambas
(function () {
    const TIPOS_POST = ["Feature", "Mejora", "Fix", "Devlog", "Release", "Nota"];

    window.AdminSchemas = {
        Posts: {
            tabla: "Posts",
            etiqueta: { en: "Post", es: "Entrada" },
            // Con que campo se muestra la fila en listados de admin.
            titulo: "Titulo",
            campos: [
                { nombre: "Titulo",    tipo: "text",     i18n: true, requerido: true },
                { nombre: "Slug",      tipo: "text",     ayuda: { en: "Used in the URL. Leave empty to derive it from the title.",
                                                                  es: "Se usa en la URL. Vacío para derivarlo del título." } },
                { nombre: "Resumen",   tipo: "longtext", i18n: true },
                { nombre: "Contenido", tipo: "markdown", i18n: true },
                { nombre: "Fecha",     tipo: "date" },
                { nombre: "Tipo",      tipo: "status",   opciones: TIPOS_POST },
                { nombre: "Version",   tipo: "text" },
                { nombre: "Etiquetas", tipo: "text" },
                { nombre: "Publicado", tipo: "bool" },
                { nombre: "Destacado", tipo: "bool" },
                { nombre: "Juego",     tipo: "relation", tablaRelacionada: "ProyectosJuegos" },
                { nombre: "Proyecto",  tipo: "relation", tablaRelacionada: "Proyectos" }
            ]
        },

        Proyectos: {
            tabla: "Proyectos",
            etiqueta: { en: "Project", es: "Proyecto" },
            titulo: "Titulo",
            campos: [
                { nombre: "Titulo",       tipo: "text",     i18n: true, requerido: true },
                { nombre: "Descripcion",  tipo: "longtext", i18n: true },
                { nombre: "Tecnologias",  tipo: "text" },
                { nombre: "Organizacion", tipo: "text",     i18n: true },
                { nombre: "LinkRepo",     tipo: "text" },
                { nombre: "LinkDemo",     tipo: "text" },
                { nombre: "Destacado",    tipo: "bool" },
                { nombre: "Orden",        tipo: "int" },
                { nombre: "Historia",     tipo: "markdown", i18n: true },
                { nombre: "Retos",        tipo: "markdown", i18n: true },
                { nombre: "Aprendizajes", tipo: "markdown", i18n: true }
            ]
        },

        // Ojo: aca la columna espanola es DescripcionES, no Descripcion. El
        // resolver de I18n ya lo maneja; el editor usa el nombre real.
        ProyectosJuegos: {
            tabla: "ProyectosJuegos",
            etiqueta: { en: "Game", es: "Juego" },
            titulo: "Titulo",
            campos: [
                { nombre: "Titulo",        tipo: "text",     i18n: true, requerido: true },
                { nombre: "DescripcionES", tipo: "longtext", etiqueta: { en: "Description (ES)", es: "Descripción (ES)" } },
                { nombre: "DescripcionEN", tipo: "longtext", etiqueta: { en: "Description (EN)", es: "Descripción (EN)" } },
                { nombre: "Engine",        tipo: "text" },
                { nombre: "LinkJugar",     tipo: "text" },
                { nombre: "LinkRepo",      tipo: "text" },
                { nombre: "Orden",         tipo: "int" },
                { nombre: "Historia",      tipo: "markdown", i18n: true },
                { nombre: "Retos",         tipo: "markdown", i18n: true },
                { nombre: "Aprendizajes",  tipo: "markdown", i18n: true }
            ]
        },

        Experiencia: {
            tabla: "Experiencia",
            etiqueta: { en: "Experience", es: "Experiencia" },
            titulo: "Cargo",
            campos: [
                { nombre: "Cargo",       tipo: "text",     i18n: true, requerido: true },
                { nombre: "Empresa",     tipo: "text" },
                { nombre: "Periodo",     tipo: "text",     i18n: true },
                { nombre: "Descripcion", tipo: "longtext", i18n: true },
                { nombre: "Orden",       tipo: "int" }
            ]
        }
    };
})();
