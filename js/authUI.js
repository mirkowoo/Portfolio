// Dialogo de inicio de sesion y registro, mas el estado de sesion en el header.
(function () {
    const t = key => window.I18n.t(key);
    let dialog = null;
    let mode = "login";

    function build() {
        if (dialog) return dialog;

        dialog = document.createElement("dialog");
        dialog.className = "auth-dialog";
        dialog.innerHTML = `
            <form class="auth-form" method="dialog">
                <div class="auth-tabs">
                    <button type="button" class="auth-tab" data-mode="login">${t("auth.signInTab")}</button>
                    <button type="button" class="auth-tab" data-mode="register">${t("auth.registerTab")}</button>
                </div>

                <label class="auth-field auth-only-register">
                    <span>${t("auth.displayName")}</span>
                    <input type="text" name="username" autocomplete="nickname">
                </label>

                <label class="auth-field">
                    <span>${t("auth.email")}</span>
                    <input type="email" name="email" required autocomplete="email">
                </label>

                <label class="auth-field">
                    <span>${t("auth.password")}</span>
                    <input type="password" name="password" required minlength="8" autocomplete="current-password">
                </label>

                <p class="auth-error" data-auth-error hidden></p>

                <div class="auth-actions">
                    <button type="button" class="auth-cancel">${t("auth.cancel")}</button>
                    <button type="submit" class="auth-submit">${t("auth.submitLogin")}</button>
                </div>
            </form>
        `;

        document.body.appendChild(dialog);

        dialog.querySelectorAll(".auth-tab").forEach(tab => {
            tab.addEventListener("click", () => setMode(tab.dataset.mode));
        });

        dialog.querySelector(".auth-cancel").addEventListener("click", () => dialog.close());
        dialog.querySelector(".auth-form").addEventListener("submit", submit);

        return dialog;
    }

    function setMode(next) {
        mode = next;
        const isRegister = mode === "register";

        dialog.querySelectorAll(".auth-tab").forEach(tab => {
            tab.classList.toggle("is-active", tab.dataset.mode === mode);
        });
        dialog.querySelectorAll(".auth-only-register").forEach(field => {
            field.hidden = !isRegister;
        });
        dialog.querySelector(".auth-submit").textContent =
            isRegister ? t("auth.submitRegister") : t("auth.submitLogin");
        dialog.querySelector('[name="password"]')
            .setAttribute("autocomplete", isRegister ? "new-password" : "current-password");
        showError("");
    }

    function showError(message) {
        const box = dialog.querySelector("[data-auth-error]");
        box.textContent = message;
        box.hidden = !message;
    }

    async function submit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector(".auth-submit");
        const data = Object.fromEntries(new FormData(form).entries());

        submitButton.disabled = true;
        showError("");

        try {
            if (mode === "register") {
                const created = await window.Auth.register({
                    email: data.email,
                    password: data.password,
                    username: data.username || undefined
                });
                if (!created) {
                    showError(t("auth.confirmEmail"));
                    setMode("login");
                    return;
                }
            } else {
                await window.Auth.login(data.email, data.password);
            }
            form.reset();
            dialog.close();
        } catch (error) {
            showError(error.message || t("auth.genericError"));
        } finally {
            submitButton.disabled = false;
        }
    }

    function open(nextMode = "login") {
        build();
        setMode(nextMode);
        dialog.showModal();
    }

    function renderHeaderState() {
        const slot = document.querySelector("[data-auth-slot]");
        if (!slot) return;

        slot.innerHTML = "";

        if (window.Auth.isLoggedIn()) {
            const name = document.createElement("span");
            name.className = "auth-user";
            name.textContent = window.Auth.displayName();

            const out = document.createElement("button");
            out.type = "button";
            out.className = "button-header button-ghost";
            out.textContent = t("auth.signOut");
            out.addEventListener("click", () => window.Auth.logout());

            slot.append(name, out);
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "button-header";
        button.textContent = t("auth.signIn");
        button.addEventListener("click", () => open("login"));
        slot.appendChild(button);
    }

    window.AuthUI = { open, renderHeaderState };

    window.addEventListener("DOMContentLoaded", () => {
        window.Auth.onChange(() => {
            renderHeaderState();
            document.dispatchEvent(new CustomEvent("auth:changed"));
        });
    });

    // El dialogo se construye una sola vez, asi que al cambiar de idioma hay que
    // descartarlo para que se reconstruya con los textos nuevos.
    window.I18n.onChange(() => {
        dialog?.remove();
        dialog = null;
        renderHeaderState();
    });
})();
