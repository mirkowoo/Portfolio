// Página "Manejo de datos" del portafolio.
//
// Existe porque el sitio tiene cuentas: en cuanto se pide un correo hay que
// decir qué se guarda, dónde y por cuánto. La cuenta además es del espacio de
// trabajo, no solo de acá, y eso hay que decirlo donde se crea.
//
// Lo que dice esta página está contrastado contra el código y contra el
// workspace, no redactado de memoria. Si cambia lo que se guarda, cambia acá.
//
// Archivo nuevo, como el resto del rediseño: los existentes no se propagan por
// el CDN (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2).
(function () {
    // Correo de contacto para bajas y consultas de datos. Va enlazado como
    // mailto: en una pagina de manejo de datos, escribir es la accion.
    const CORREO = "marcosfranichevicmuixi@gmail.com";
    const CONTACTO = `<a href="mailto:${CORREO}">${CORREO}</a>`;

    const T = {
        es: {
            enlace: "Manejo de datos",
            titulo: "Manejo de datos",
            actualizado: "Última actualización: 24 de agosto de 2026",
            entrada:
                "Este sitio funciona sin cuenta. Solo hace falta una si quieres comentar, " +
                "reaccionar a una entrada o llevar tus logros. Esto es todo lo que se guarda " +
                "en ese caso.",
            bloques: [
                {
                    titulo: "//_la_cuenta_",
                    cuerpo: [
                        "Para crear una cuenta se piden <b>correo y contraseña</b>, y opcionalmente " +
                        "un nombre visible. La contraseña no pasa por este sitio: la gestiona " +
                        "Praxsuite, el servicio donde está alojado todo.",
                        "La cuenta es del <b>espacio de trabajo</b>, no solo de este portafolio. " +
                        "Con las mismas credenciales entras a LSCh, y los logros son los mismos " +
                        "en las dos. Si borras la cuenta, se va de ambas."
                    ]
                },
                {
                    titulo: "//_lo_que_se_guarda_",
                    cuerpo: ["Ligado a tu cuenta:"],
                    lista: [
                        "El <b>nombre visible</b> y la <b>foto de perfil</b>, si pones una. La foto se " +
                        "reduce a 256 píxeles antes de subirla.",
                        "Los <b>comentarios</b> que publiques, con su fecha.",
                        "Las <b>reacciones</b> que dejes en una entrada.",
                        "Los <b>logros</b> que obtengas, con la fecha y la aplicación donde los conseguiste."
                    ]
                },
                {
                    titulo: "//_en_tu_navegador_",
                    cuerpo: [
                        "En el almacenamiento local del navegador quedan dos cosas: el <b>idioma</b> " +
                        "que elegiste y el <b>token de sesión</b> mientras estés conectado. Se borran " +
                        "al desconectarte o al limpiar los datos del sitio.",
                        "Este sitio no incluye analítica ni cookies de terceros propias."
                    ]
                },
                {
                    titulo: "//_registros_tecnicos_",
                    cuerpo: [
                        "El servicio que atiende las peticiones guarda un <b>registro de llamadas a la " +
                        "API</b> que incluye la dirección IP de origen y, si hay sesión, el correo de " +
                        "la cuenta. Sirve para diagnosticar fallas. No lo controlo desde el sitio: " +
                        "es del alojamiento."
                    ]
                },
                {
                    titulo: "//_con_quien_se_comparte_",
                    cuerpo: [
                        "Con nadie. No se venden ni se ceden datos, y no hay servicios de terceros " +
                        "integrados. Los datos viven en Praxsuite, que es donde está alojado el sitio."
                    ]
                },
                {
                    titulo: "//_borrar_tus_datos_",
                    cuerpo: [
                        "Escribe a " + CONTACTO + " y se borran la cuenta y todo lo asociado: " +
                        "comentarios, reacciones, logros y perfil. Sin trámite y sin preguntas."
                    ]
                }
            ]
        },

        en: {
            enlace: "How your data is handled",
            titulo: "How your data is handled",
            actualizado: "Last updated: 24 August 2026",
            entrada:
                "This site works without an account. You only need one to comment, react to a " +
                "post, or keep your achievements. Here is everything that gets stored in that case.",
            bloques: [
                {
                    titulo: "//_the_account_",
                    cuerpo: [
                        "Creating an account asks for an <b>email and a password</b>, and optionally a " +
                        "display name. The password never passes through this site: it is handled by " +
                        "Praxsuite, the service everything is hosted on.",
                        "The account belongs to the <b>workspace</b>, not just to this portfolio. The " +
                        "same credentials sign you in to LSCh, and achievements are shared between " +
                        "them. Delete the account and it is gone from both."
                    ]
                },
                {
                    titulo: "//_what_is_stored_",
                    cuerpo: ["Tied to your account:"],
                    lista: [
                        "Your <b>display name</b> and <b>profile picture</b>, if you set one. The picture is " +
                        "resized to 256 pixels before upload.",
                        "Any <b>comments</b> you post, with their date.",
                        "Any <b>reactions</b> you leave on a post.",
                        "The <b>achievements</b> you earn, with the date and the app where you earned them."
                    ]
                },
                {
                    titulo: "//_in_your_browser_",
                    cuerpo: [
                        "Local storage keeps two things: the <b>language</b> you picked and your " +
                        "<b>session token</b> while you are signed in. Both go away when you sign out or " +
                        "clear the site data.",
                        "This site carries no analytics and no third-party cookies of its own."
                    ]
                },
                {
                    titulo: "//_technical_logs_",
                    cuerpo: [
                        "The service answering the requests keeps an <b>API call log</b> that includes the " +
                        "source IP address and, when there is a session, the account email. It exists " +
                        "for debugging. It is not something the site controls — it belongs to the host."
                    ]
                },
                {
                    titulo: "//_who_it_is_shared_with_",
                    cuerpo: [
                        "Nobody. Nothing is sold or handed over, and there are no third-party services " +
                        "wired in. The data lives in Praxsuite, where the site is hosted."
                    ]
                },
                {
                    titulo: "//_deleting_your_data_",
                    cuerpo: [
                        "Write to " + CONTACTO + " and the account and everything attached to it — " +
                        "comments, reactions, achievements and profile — get deleted. No forms, no " +
                        "questions asked."
                    ]
                }
            ]
        }
    };

    function txt() {
        return T[window.I18n.getLang()] || T.es;
    }

    function pintar() {
        const raiz = document.querySelector("#datos .content");
        if (!raiz) return;
        const t = txt();

        raiz.innerHTML = `
            <header class="datos-intro">
                <h1>${t.titulo}</h1>
                <p class="datos-fecha">${t.actualizado}</p>
                <p class="datos-entrada">${t.entrada}</p>
            </header>

            ${t.bloques.map(b => `
                <section class="datos-bloque">
                    <h2 class="rotulo">${b.titulo}</h2>
                    <div class="md">
                        ${b.cuerpo.map(p => `<p>${p}</p>`).join("")}
                        ${b.lista ? `<ul>${b.lista.map(li => `<li>${li}</li>`).join("")}</ul>` : ""}
                    </div>
                </section>
            `).join("")}
        `;
    }

    function inicializar() {
        if (!window.Router) return;

        window.Router.on("/datos", () => {
            window.showPage("datos");
            pintar();
        });

        // Si cambia el idioma estando en la página, se repinta en el sitio.
        window.I18n.onChange(() => {
            if (window.Router.currentPath && window.Router.currentPath() === "/datos") pintar();
        });
    }

    // El aviso corto va donde se crea la cuenta, no escondido en el pie. Se
    // inyecta parcheando AuthUI.open porque authUI.js no se puede editar.
    function avisarEnElDialogo() {
        if (!window.AuthUI?.open) return;
        const original = window.AuthUI.open;
        window.AuthUI.open = function () {
            const r = original.apply(this, arguments);
            const form = document.querySelector(".auth-dialog .auth-form");
            if (form && !form.querySelector("[data-aviso-datos]")) {
                const nota = document.createElement("p");
                nota.className = "auth-nota-datos";
                nota.setAttribute("data-aviso-datos", "");
                const t = txt();
                nota.innerHTML = window.I18n.getLang() === "en"
                    ? `Your account works across every app in this workspace. See <a href="#/datos">${t.enlace}</a>.`
                    : `Tu cuenta sirve en todas las aplicaciones de este espacio de trabajo. Mira el <a href="#/datos">${t.enlace}</a>.`;
                nota.querySelector("a").addEventListener("click", () => {
                    document.querySelector(".auth-dialog")?.close();
                });
                form.appendChild(nota);
            }
            return r;
        };
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => { inicializar(); avisarEnElDialogo(); });
    } else {
        inicializar();
        avisarEnElDialogo();
    }
})();
