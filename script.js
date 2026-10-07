document.documentElement.classList.add("js");

const form = document.querySelector("[data-signup-form]");
const success = document.querySelector("[data-success]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
});

const topbar = document.querySelector("[data-topbar]");
if (topbar) {
    const syncTopbar = () => topbar.classList.toggle("is-stuck", window.scrollY > 12);
    syncTopbar();
    window.addEventListener("scroll", syncTopbar, { passive: true });
}

const revealNodes = document.querySelectorAll(".reveal");
if (reducedMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
} else {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.1 });
    revealNodes.forEach((node) => observer.observe(node));
    setTimeout(() => revealNodes.forEach((node) => node.classList.add("is-visible")), 2500);
}

if (form && success) {
    const emailInput = form.querySelector("#email");
    const whatsappInput = form.querySelector("#whatsapp");
    const contactGroup = form.querySelector("[data-contact-group]");
    const alertBox = form.querySelector("[data-form-alert]");
    const submitButton = form.querySelector("[data-submit]");
    const buttonLabel = submitButton.querySelector(".button-label");
    const defaultLabel = buttonLabel.textContent;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

    const MESSAGES = {
        missingContact: "يرجى إدخال البريد الإلكتروني أو رقم واتساب للمتابعة.",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
        invalidWhatsapp: "أدخل رقم واتساب صحيحًا، مثل ‎0512345678‎.",
        network: "تعذّر إرسال الطلب حاليًا. تحقّق من اتصالك وحاول مرة أخرى.",
        sending: "جارٍ الإرسال…",
    };

    function normalizeDigits(value) {
        return value.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) % 16));
    }

    function normalizeWhatsapp(value) {
        let digits = normalizeDigits(value).replace(/[\s\-().]/g, "");
        if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
        if (digits.startsWith("+")) return digits;
        if (digits.startsWith("966") && digits.length === 12) return `+${digits}`;
        if (digits.startsWith("05") && digits.length === 10) return `+966${digits.slice(1)}`;
        if (digits.startsWith("5") && digits.length === 9) return `+966${digits}`;
        return digits;
    }

    function isValidWhatsapp(value) {
        return /^\+?\d{8,15}$/.test(value);
    }

    function setFieldError(input, message) {
        const field = input.closest(".field");
        const errorNode = field.querySelector(".field-error");
        field.classList.toggle("is-invalid", Boolean(message));
        input.setAttribute("aria-invalid", message ? "true" : "false");
        errorNode.textContent = message || "";
        errorNode.hidden = !message;
    }

    function showAlert(message, type = "error") {
        alertBox.textContent = message;
        alertBox.classList.toggle("is-info", type === "info");
        alertBox.hidden = false;
    }

    function clearAlert() {
        alertBox.hidden = true;
        alertBox.textContent = "";
        contactGroup.classList.remove("is-invalid");
    }

    function shake(node) {
        if (reducedMotion) return;
        node.classList.remove("is-shake");
        void node.offsetWidth;
        node.classList.add("is-shake");
    }

    function setLoading(loading) {
        submitButton.disabled = loading;
        submitButton.classList.toggle("is-loading", loading);
        buttonLabel.textContent = loading ? MESSAGES.sending : defaultLabel;
    }

    function validate() {
        const email = emailInput.value.trim();
        const whatsapp = normalizeWhatsapp(whatsappInput.value.trim());
        let firstInvalid = null;

        setFieldError(emailInput, "");
        setFieldError(whatsappInput, "");
        clearAlert();

        if (!email && !whatsapp) {
            contactGroup.classList.add("is-invalid");
            emailInput.setAttribute("aria-invalid", "true");
            whatsappInput.setAttribute("aria-invalid", "true");
            showAlert(MESSAGES.missingContact);
            shake(contactGroup);
            emailInput.focus();
            return false;
        }

        if (email && !EMAIL_RE.test(email)) {
            setFieldError(emailInput, MESSAGES.invalidEmail);
            firstInvalid = firstInvalid || emailInput;
        }

        if (whatsapp && !isValidWhatsapp(whatsapp)) {
            setFieldError(whatsappInput, MESSAGES.invalidWhatsapp);
            firstInvalid = firstInvalid || whatsappInput;
        }

        if (firstInvalid) {
            shake(firstInvalid.closest(".field"));
            firstInvalid.focus();
            return false;
        }

        if (whatsapp) whatsappInput.value = whatsapp;
        return true;
    }

    [emailInput, whatsappInput].forEach((input) => {
        input.addEventListener("input", () => {
            setFieldError(input, "");
            clearAlert();
            [emailInput, whatsappInput].forEach((i) => i.removeAttribute("aria-invalid"));
        });
    });

    function showSuccess() {
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const body = new URLSearchParams(new FormData(form));
            const response = await fetch(form.getAttribute("action") || window.location.pathname, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            showSuccess();
        } catch (error) {
            console.error("MenuFacts signup failed:", error);
            showAlert(MESSAGES.network);
            shake(alertBox);
        } finally {
            setLoading(false);
        }
    });
}
