const status = document.querySelector('#status');
async function refresh() {
  const result = await chrome.runtime.sendMessage({ type: 'refresh' });
  status.textContent = result.connected ? result.active ? 'Focus Shield is on.' : 'Connected · ready for your next session.' : 'Not connected. Open Mischief and check your pairing code.';
  document.querySelector('#unlock').hidden = !result.active;
  document.querySelector('#disconnect').hidden = !(await chrome.storage.local.get('pairingCode')).pairingCode;
  return result;
}
document.querySelector('#pair').onsubmit = async event => { event.preventDefault(); const code = document.querySelector('#code').value.trim(); if (!/^[a-zA-Z0-9_-]{43}$/.test(code)) { status.textContent = 'Copy the complete pairing code from Mischief.'; return; } await chrome.storage.local.set({ pairingCode: code }); document.querySelector('#code').value = ''; await refresh(); };
document.querySelector('#unlock').onclick = async () => { await chrome.runtime.sendMessage({ type: 'pause' }); await refresh(); };
document.querySelector('#disconnect').onclick = async () => { await chrome.storage.local.remove('pairingCode'); await refresh(); };
refresh();
