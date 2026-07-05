/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzguidoti/coi-serviceworker */
const coepCredentialless = false;

if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", (event) => {
        const { request } = event;
        if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
            return;
        }

        let r = request;
        if (coepCredentialless && request.mode === "no-cors") {
            r = new Request(request, {
                credentials: "omit",
            });
        }

        event.respondWith(
            fetch(r)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set(
                        "Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp"
                    );
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    // In the window context
    const currentScript = document.currentScript;
    const scriptUrl = currentScript ? currentScript.src : 'coi-serviceworker.js';

    if (window.crossOriginIsolated === false) {
        navigator.serviceWorker.register(scriptUrl).then(registration => {
            registration.addEventListener("updatefound", () => {
                // Reloader
                location.reload();
            });
            if (registration.active) {
                location.reload();
            }
        });
    }
}
