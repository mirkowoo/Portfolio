(function () {
    let previousPageId = "home";

    function valueOrFallback(value, fallback = "") {
        if (Array.isArray(value)) return value.filter(Boolean).join(", ");
        if (value === null || value === undefined) return fallback;
        return String(value).trim() || fallback;
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = valueOrFallback(value);
    }

    function addTextBlock(parent, label, value) {
        const cleanValue = valueOrFallback(value);
        if (!cleanValue) return;

        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        paragraph.appendChild(strong);
        paragraph.append(cleanValue);
        parent.appendChild(paragraph);
    }

    function addAction(parent, label, url) {
        const cleanUrl = valueOrFallback(url);
        if (!cleanUrl) return;

        const link = document.createElement("a");
        link.href = cleanUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        parent.appendChild(link);
    }

    function addCardHeading(parent, value) {
        const heading = document.createElement("h3");
        heading.textContent = valueOrFallback(value, "Untitled");
        parent.appendChild(heading);
    }

    function addCardField(parent, label, value) {
        addTextBlock(parent, label, value);
    }

    function addCardLinkField(parent, label, url) {
        const cleanUrl = valueOrFallback(url);
        if (!cleanUrl) return;

        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");
        const link = document.createElement("a");

        strong.textContent = `${label}: `;
        link.href = cleanUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = cleanUrl;

        paragraph.appendChild(strong);
        paragraph.appendChild(link);
        parent.appendChild(paragraph);
    }

    function renderMedia(detail) {
        const media = document.querySelector("[data-detail-media]");
        if (!media) return;

        media.innerHTML = "";
        const imageUrl = valueOrFallback(detail.image);

        if (imageUrl) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = valueOrFallback(detail.title, "Portfolio detail");
            media.appendChild(image);
            return;
        }

        const initials = valueOrFallback(detail.title, "MW")
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0))
            .join("")
            .toUpperCase();

        media.textContent = initials || "MW";
    }

    function openCardDetail(detail) {
        const activePage = document.querySelector(".page.active");
        if (activePage?.id && activePage.id !== "detail") {
            previousPageId = activePage.id;
        }

        setText("[data-detail-type]", detail.type);
        setText("[data-detail-title]", detail.title);
        setText("[data-detail-summary]", detail.summary);
        renderMedia(detail);

        const meta = document.querySelector("[data-detail-meta]");
        const story = document.querySelector("[data-detail-story]");
        const actions = document.querySelector("[data-detail-actions]");

        if (meta) {
            meta.innerHTML = "";
            (detail.meta ?? []).forEach(item => addTextBlock(meta, item.label, item.value));
        }

        if (story) {
            story.innerHTML = "";
            addTextBlock(story, "Historia", detail.story || detail.summary);
        }

        if (actions) {
            actions.innerHTML = "";
            addAction(actions, "Abrir demo", detail.demoUrl);
            addAction(actions, "Ver repositorio", detail.repoUrl);
            addAction(actions, "Ver perfil", detail.profileUrl);
        }

        window.showPage("detail");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function makeCardInteractive(card, detail) {
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Open detail for ${valueOrFallback(detail.title, "portfolio item")}`);

        card.addEventListener("click", event => {
            if (event.target.closest("a")) return;
            openCardDetail(detail);
        });

        card.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openCardDetail(detail);
        });
    }

    function initDetailBackButton() {
        const backButton = document.querySelector("[data-detail-back]");
        if (!backButton) return;

        backButton.addEventListener("click", () => {
            window.showPage(previousPageId);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    window.openCardDetail = openCardDetail;
    window.makeCardInteractive = makeCardInteractive;
    window.addCardHeading = addCardHeading;
    window.addCardField = addCardField;
    window.addCardLinkField = addCardLinkField;

    initDetailBackButton();
})();
