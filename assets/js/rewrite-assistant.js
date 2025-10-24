/**
 * Rewrite Assistant front‑end logic.
 * Calls the proxy at /api/rewrite with different tasks (plain, formal, creative, paraphrase).
 * Handles clearing outputs, copying results, and provides stubs for feedback/plagiarism.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Grab references to inputs and outputs
    const txtInput = document.getElementById('rwInput');
    const variantSel = document.getElementById('rwVariant');

    const outPlain = document.getElementById('outPlain');
    const outFormal = document.getElementById('outFormal');
    const outCreative = document.getElementById('outCreative');
    const outParaphrase = document.getElementById('outParaphrase');

    // Utility: Fetch rewrite from proxy
    async function fetchRewrite(task) {
        const text = txtInput.value.trim();
        if (!text) {
            alert('Please enter some text first.');
            return '';
        }
        try {
            const res = await fetch('/api/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    task,
                    variant: variantSel.value
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error || 'Error from proxy');
            }
            const data = await res.json();
            return data.rewrite || '';
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
            return '';
        }
    }

    // Bind click handlers to each rewrite button
    document.getElementById('btnPlain').addEventListener('click', async () => {
        outPlain.value = 'Loading…';
        outPlain.value = await fetchRewrite('plain');
    });

    document.getElementById('btnFormal').addEventListener('click', async () => {
        outFormal.value = 'Loading…';
        outFormal.value = await fetchRewrite('formal');
    });

    document.getElementById('btnCreative').addEventListener('click', async () => {
        outCreative.value = 'Loading…';
        outCreative.value = await fetchRewrite('creative');
    });

    document.getElementById('btnParaphrase').addEventListener('click', async () => {
        outParaphrase.value = 'Loading…';
        outParaphrase.value = await fetchRewrite('paraphrase');
    });

    // Stub implementations for feedback and plagiarism buttons
    document.getElementById('btnFeedback').addEventListener('click', () => {
        alert('Feedback functionality not yet implemented.');
        // Future: call your proxy with a "feedback" task or another endpoint
    });

    document.getElementById('btnPlag').addEventListener('click', () => {
        alert('Plagiarism check functionality not yet implemented.');
        // Future: call your plagiarism-check API here
    });

    // Clear all fields
    document.getElementById('btnClear').addEventListener('click', () => {
        txtInput.value = '';
        outPlain.value = '';
        outFormal.value = '';
        outCreative.value = '';
        outParaphrase.value = '';
    });

    // Copy result when clicking a copy button (uses data-copy attribute)
    document.querySelectorAll('.out-actions button[data-copy]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.getAttribute('data-copy');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                try {
                    await navigator.clipboard.writeText(targetEl.value);
                    btn.textContent = 'Copied!';
                    setTimeout(() => (btn.textContent = 'Copy'), 1500);
                } catch {
                    // Fallback: select text and use execCommand
                    targetEl.select();
                    document.execCommand('copy');
                    btn.textContent = 'Copied!';
                    setTimeout(() => (btn.textContent = 'Copy'), 1500);
                }
            }
        });
    });

    // Hook up the research search if you plan to implement it
    document.getElementById('btnResearch')?.addEventListener('click', () => {
        alert('Research search is not implemented in this example.');
        // TODO: Implement your CrossRef/Europe PMC search here
    });
});
