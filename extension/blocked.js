const original = location.hash.slice(1);
document.querySelector('#save').disabled = !/^https?:\/\//.test(original);
document.querySelector('#return').onclick = async () => { const result = await chrome.runtime.sendMessage({ type: 'return' }); document.querySelector('#feedback').textContent = result.returned ? '' : 'Select a work tab in Mischief, or pause your session.'; };
document.querySelector('#save').onclick = async () => { const result = await chrome.runtime.sendMessage({ type: 'save', url: original }); document.querySelector('#feedback').textContent = result.error ? result.error : result.connected ? 'Saved in Keep my thoughts.' : 'Reconnect Mischief to save this page.'; };
async function refresh() { const result = await chrome.runtime.sendMessage({ type: 'state' }); const s = result.state || {}; const seconds = Math.ceil((s.remainingMs || 0) / 1000); document.querySelector('#clock').textContent = s.active ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining` : 'Restrictions released'; }
setInterval(refresh, 1000); refresh();
