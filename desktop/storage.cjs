const fs = require('node:fs/promises');
const path = require('node:path');
// Coalesce frequent preferences without blocking Electron's main event loop.
// Writes remain serialized and each file is replaced atomically.
function createStorage(directory, { delay = 80, onError = () => {}, onSaved = () => {}, io = fs } = {}) {
  const pending = new Map(); let timer, pumping; let writes = 0;
  async function pump() {
    while (pending.size) {
      const batch = [...pending]; pending.clear();
      for (const [name, value] of batch) {
        try {
          await io.mkdir(directory, { recursive: true });
          const target = path.join(directory, name);
          await io.writeFile(target + '.tmp', value);
          await io.rename(target + '.tmp', target);
          writes++; onSaved(name);
        } catch (error) { onError(error, name); }
      }
    }
  }
  function flush() {
    clearTimeout(timer);
    if (!pumping) pumping = pump().finally(() => { pumping = null; });
    return pumping;
  }
  return {
    write(name, data) {
      pending.set(name, JSON.stringify(data));
      clearTimeout(timer); timer = setTimeout(flush, delay);
    },
    flush,
    stats: () => ({ writes, pending: pending.size, writing: !!pumping })
  };
}
module.exports = { createStorage };
