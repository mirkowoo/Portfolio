// Internacionalizacion. Idioma principal: ingles.
//
// Textos de interfaz: diccionario UI de abajo, via t("clave").
//
// Textos que vienen de Praxsuite: localized(fila, "Campo") resuelve en este orden
//   1. Campo + sufijo del idioma activo   (DescripcionEN)
//   2. Campo sin sufijo                   (Descripcion  -> historicamente en espanol)
//   3. Campo + sufijo del otro idioma     (DescripcionES)
// Asi conviven tablas con convencion ES/EN explicita (ProyectosJuegos) y tablas
// donde la columna base es la espanola (Proyectos), sin migrar nada.
(function () {
    const STORAGE_KEY = "portfolio.lang";
    const DEFAULT_LANG = "en";
    const LANGS = ["en", "es"];

    const UI = {
        en: {
            "nav.devlog": "Devlog",
            "nav.experience": "Experience",
            "nav.games": "Games",
            "nav.projects": "Projects",

            "auth.signIn": "Sign in",
            "auth.signOut": "Sign out",
            "auth.signInTab": "Sign in",
            "auth.registerTab": "Create account",
            "auth.displayName": "Display name",
            "auth.email": "Email",
            "auth.password": "Password",
            "auth.cancel": "Cancel",
            "auth.submitLogin": "Sign in",
            "auth.submitRegister": "Create account",
            "auth.genericError": "Something went wrong. Please try again.",
            "auth.loginFailed": "Could not sign in.",
            "auth.needSession": "You need to sign in.",
            "auth.confirmEmail": "Account created. Check your email to confirm it, then sign in.",
            "auth.expired": "Your session expired.",
            "auth.signInAgain": "Sign in again",

            "feed.title": "Devlog",
            "feed.intro": "I'm Mirko, a software developer. This is where I post what I'm building: new features, things I broke and fixed, and design decisions behind my games and projects.",
            "feed.all": "All",
            "feed.empty": "No posts published yet.",
            "feed.emptyFiltered": "No posts of this type yet.",
            "feed.loading": "Loading...",

            "post.read": "Read post",
            "post.portfolio": "Portfolio",
            "post.backToFeed": "Back to the feed",
            "post.backTo": "Back to {name}",
            "post.notFound": "I couldn't find that post.",
            "post.backHome": "Back to home",

            "project.back": "Back",
            "project.game": "Game",
            "project.project": "Project",
            "project.notFound": "I couldn't find that project.",
            "project.devlog": "Devlog",
            "project.devlogEmpty": "No devlog entries for this project yet.",
            "project.play": "Play",
            "project.demo": "Demo",
            "project.repo": "Repository",

            "field.Historia": "Story",
            "field.Retos": "Challenges",
            "field.Aprendizajes": "Takeaways",
            "field.Engine": "Engine",
            "field.Tecnologias": "Technologies",
            "field.Organizacion": "Organisation",
            "field.Descripcion": "Description",
            "field.Empresa": "Company",
            "field.Periodo": "Period",

            "comments.title": "Comments",
            "comments.empty": "No comments yet. Be the first.",
            "comments.as": "Commenting as {name}",
            "comments.placeholder": "What did you think? Any ideas or questions?",
            "comments.submit": "Post comment",
            "comments.sent": "Comment posted.",
            "comments.failed": "Could not send the comment.",
            "comments.loginPrompt": "Sign in to leave a comment.",
            "comments.loginButton": "Sign in or create an account",
            "comments.anon": "Anonymous",

            "reactions.failed": "Could not register the reaction.",
            "reaction.like": "Like",
            "reaction.fire": "Awesome",
            "reaction.idea": "Great idea",
            "reaction.wow": "Wow",

            "tipo.Feature": "Feature",
            "tipo.Mejora": "Improvement",
            "tipo.Fix": "Fix",
            "tipo.Devlog": "Devlog",
            "tipo.Release": "Release",
            "tipo.Nota": "Note",

            "list.experienceTitle": "Experience",
            "list.experienceIntro": "My LinkedIn profile:",
            "list.gamesTitle": "Games",
            "list.gamesIntro": "My Itch.io profile:",
            "list.projectsTitle": "Projects",
            "list.empty": "No data available.",
            "list.loadError": "Could not load the data.",

            "lang.toggle": "Español",
            "lang.toggleTitle": "Ver en español",
            "site.title": "Mirko Franichevic — Devlog and portfolio"
        },
        es: {
            "nav.devlog": "Devlog",
            "nav.experience": "Experiencia",
            "nav.games": "Juegos",
            "nav.projects": "Proyectos",

            "auth.signIn": "Entrar",
            "auth.signOut": "Salir",
            "auth.signInTab": "Iniciar sesión",
            "auth.registerTab": "Crear cuenta",
            "auth.displayName": "Nombre para mostrar",
            "auth.email": "Correo",
            "auth.password": "Contraseña",
            "auth.cancel": "Cancelar",
            "auth.submitLogin": "Entrar",
            "auth.submitRegister": "Crear cuenta",
            "auth.genericError": "No se pudo completar la operación.",
            "auth.loginFailed": "No se pudo iniciar sesión.",
            "auth.needSession": "Necesitas iniciar sesión.",
            "auth.confirmEmail": "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.",
            "auth.expired": "Tu sesión expiró.",
            "auth.signInAgain": "Volver a entrar",

            "feed.title": "Devlog",
            "feed.intro": "Soy Mirko, desarrollador de software. Acá voy publicando lo que construyo: features nuevas, cosas que rompí y arreglé, y decisiones de diseño de mis juegos y proyectos.",
            "feed.all": "Todo",
            "feed.empty": "Todavía no hay entradas publicadas.",
            "feed.emptyFiltered": "No hay entradas de este tipo todavía.",
            "feed.loading": "Cargando...",

            "post.read": "Leer entrada",
            "post.portfolio": "Portafolio",
            "post.backToFeed": "Volver al feed",
            "post.backTo": "Volver a {name}",
            "post.notFound": "No encontré esa entrada.",
            "post.backHome": "Volver al inicio",

            "project.back": "Volver",
            "project.game": "Juego",
            "project.project": "Proyecto",
            "project.notFound": "No encontré ese proyecto.",
            "project.devlog": "Devlog",
            "project.devlogEmpty": "Todavía no hay entradas de devlog para este proyecto.",
            "project.play": "Jugar",
            "project.demo": "Demo",
            "project.repo": "Repositorio",

            "field.Historia": "Historia",
            "field.Retos": "Retos",
            "field.Aprendizajes": "Aprendizajes",
            "field.Engine": "Engine",
            "field.Tecnologias": "Tecnologías",
            "field.Organizacion": "Organización",
            "field.Descripcion": "Descripción",
            "field.Empresa": "Empresa",
            "field.Periodo": "Período",

            "comments.title": "Comentarios",
            "comments.empty": "Todavía no hay comentarios. Sé el primero.",
            "comments.as": "Comentar como {name}",
            "comments.placeholder": "¿Qué te pareció? ¿Alguna idea o duda?",
            "comments.submit": "Publicar comentario",
            "comments.sent": "Comentario publicado.",
            "comments.failed": "No se pudo enviar el comentario.",
            "comments.loginPrompt": "Inicia sesión para dejar un comentario.",
            "comments.loginButton": "Entrar o crear cuenta",
            "comments.anon": "Anónimo",

            "reactions.failed": "No se pudo registrar la reacción.",
            "reaction.like": "Me gusta",
            "reaction.fire": "Buenísimo",
            "reaction.idea": "Buena idea",
            "reaction.wow": "Wow",

            "tipo.Feature": "Feature",
            "tipo.Mejora": "Mejora",
            "tipo.Fix": "Fix",
            "tipo.Devlog": "Devlog",
            "tipo.Release": "Release",
            "tipo.Nota": "Nota",

            "list.experienceTitle": "Experiencia",
            "list.experienceIntro": "Mi perfil de LinkedIn:",
            "list.gamesTitle": "Juegos",
            "list.gamesIntro": "Mi perfil de Itch.io:",
            "list.projectsTitle": "Proyectos",
            "list.empty": "No hay datos disponibles.",
            "list.loadError": "No se pudieron cargar los datos.",

            "lang.toggle": "English",
            "lang.toggleTitle": "View in English",
            "site.title": "Mirko Franichevic — Devlog y portafolio"
        }
    };

    let lang = DEFAULT_LANG;
    const listeners = [];

    function load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        lang = LANGS.includes(stored) ? stored : DEFAULT_LANG;
        return lang;
    }

    function getLang() {
        return lang;
    }

    function otherLang() {
        return lang === "en" ? "es" : "en";
    }

    function suffix(code) {
        return code.toUpperCase();
    }

    function t(key, vars) {
        let value = UI[lang]?.[key] ?? UI[DEFAULT_LANG]?.[key] ?? key;
        if (vars) {
            Object.entries(vars).forEach(([name, replacement]) => {
                value = value.replace(`{${name}}`, replacement);
            });
        }
        return value;
    }

    function clean(value) {
        if (value === null || value === undefined) return "";
        return String(value).trim();
    }

    function localized(row, field) {
        if (!row) return "";
        return clean(row[field + suffix(lang)])
            || clean(row[field])
            || clean(row[field + suffix(otherLang())]);
    }

    function locale() {
        return lang === "en" ? "en-GB" : "es-CL";
    }

    function setLang(next) {
        if (!LANGS.includes(next) || next === lang) return;
        lang = next;
        localStorage.setItem(STORAGE_KEY, lang);
        apply();
        listeners.forEach(fn => fn(lang));
    }

    function toggle() {
        setLang(otherLang());
    }

    function onChange(fn) {
        listeners.push(fn);
    }

    // Aplica traducciones a los nodos estaticos marcados con data-i18n.
    function apply() {
        document.documentElement.lang = lang;
        document.title = t("site.title");
        document.querySelectorAll("[data-i18n]").forEach(node => {
            node.textContent = t(node.getAttribute("data-i18n"));
        });
    }

    load();

    window.I18n = {
        t, localized, getLang, setLang, toggle, onChange, apply, locale,
        LANGS, DEFAULT_LANG
    };
})();
