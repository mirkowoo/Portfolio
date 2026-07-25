// Sesion de usuario final contra Praxsuite Auth.
//
// El browser autentica directo contra /auth/login y /auth/register usando la
// clave publica pk_live_ como credencial de workspace. La respuesta trae el JWT
// del usuario, que se guarda en localStorage y se usa para comentar y reaccionar.
(function () {
    const STORAGE_KEY = "portfolio.session";
    let session = null;
    const listeners = [];

    function load() {
        try {
            session = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        } catch {
            session = null;
        }

        // Sesiones guardadas antes de leer el id desde el token pueden no tenerlo.
        if (session?.accessToken && !session.user?.id) {
            const claims = decodeClaims(session.accessToken);
            session.user = { ...session.user, id: userIdFrom(claims, session.user || {}, {}) };
        }

        return session;
    }

    function save(next) {
        session = next;
        if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else localStorage.removeItem(STORAGE_KEY);
        listeners.forEach(fn => fn(session));
    }

    function onChange(fn) {
        listeners.push(fn);
        fn(session);
    }

    function getToken() {
        return session?.accessToken || null;
    }

    function getUser() {
        return session?.user || null;
    }

    function isLoggedIn() {
        return Boolean(getToken());
    }

    // La expiracion se lee del claim exp del token, no del cuerpo de la respuesta
    // de login: es el mismo valor que va a comprobar el servidor.
    function isExpired() {
        const token = getToken();
        if (!token) return false;

        const exp = decodeClaims(token).exp;
        if (!exp) return false;

        // 30 s de margen para no mandar un token que expira en camino.
        return Date.now() >= (exp * 1000) - 30000;
    }

    function displayName() {
        const user = getUser();
        if (!user) return "";
        const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        return user.username || full || user.email || "Usuario";
    }

    // Lee los claims del JWT sin verificarlo. No se usa para autorizar nada: solo
    // para saber que id de usuario va a resolver el servidor, y asi poder marcar
    // "esta reaccion es mia" con el mismo valor que escribe la automation.
    function decodeClaims(token) {
        try {
            const payload = token.split(".")[1];
            const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
            return JSON.parse(new TextDecoder().decode(
                Uint8Array.from(json, ch => ch.charCodeAt(0))));
        } catch {
            return {};
        }
    }

    // El id que ValidateEndUserToken devuelve como endUserId es el subject del
    // JWT, asi que ese claim manda por sobre lo que traiga el cuerpo de la
    // respuesta, cuya forma cambia entre versiones del gateway.
    function userIdFrom(claims, rawUser, data) {
        return claims.sub
            || claims.nameid
            || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
            || rawUser.id || rawUser.userId || data.userId || null;
    }

    // La respuesta de auth no tiene una forma garantizada entre versiones del
    // gateway, asi que se normaliza aqui y no en el resto del codigo.
    function normalize(payload) {
        const data = payload?.data ?? payload ?? {};
        const accessToken = data.accessToken || data.access_token || data.token;
        if (!accessToken) return null;

        const rawUser = data.user || data.profile || {};
        const claims = decodeClaims(accessToken);
        return {
            accessToken,
            refreshToken: data.refreshToken || data.refresh_token || null,
            expiresAt: data.expiresAt || data.expires_at || null,
            user: {
                id: userIdFrom(claims, rawUser, data),
                email: rawUser.email || data.email || claims.email || null,
                username: rawUser.username || claims.unique_name || null,
                firstName: rawUser.firstName || rawUser.first_name || null,
                lastName: rawUser.lastName || rawUser.last_name || null
            }
        };
    }

    async function login(email, password) {
        const payload = await window.Api.authRequest("login", { email, password });
        const next = normalize(payload);
        if (!next) throw new Error(payload?.message || window.I18n.t("auth.loginFailed"));
        save(next);
        return next;
    }

    async function register(details) {
        const payload = await window.Api.authRequest("register", details);
        const next = normalize(payload);
        // Si el workspace exige confirmar el correo, no vuelven tokens todavia.
        if (next) save(next);
        return next;
    }

    function logout() {
        save(null);
    }

    load();

    window.Auth = {
        login, register, logout, onChange,
        getToken, getUser, isLoggedIn, isExpired, displayName
    };
})();
