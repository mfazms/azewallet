const fs = require('fs');
const path = require('path');

const globalsCssPath = path.join(__dirname, 'src', 'app', 'globals.css');
let globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

const missingCss = `
/* --- RECOVERED BottomTabBar CSS --- */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  height: var(--tab-bar-height);
  padding-top: 0.5rem;
  padding-bottom: var(--safe-bottom);
  z-index: 900;
  border-top: 1px solid var(--color-separator);
  background: var(--color-bg-secondary);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  transition: color 0.2s ease;
  min-height: 2.75rem;
  font-family: var(--font-sans);
  position: relative;
}

.tab-item.tab-active {
  color: var(--color-income);
}

.tab-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 1.75rem;
}

.tab-indicator {
  position: absolute;
  inset: -0.25rem -0.5rem;
  background: var(--color-income-bg);
  border-radius: var(--radius-md);
  z-index: -1;
}

.tab-label {
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* FAB Button */
.fab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-top: -1.25rem;
  min-height: auto;
  z-index: 901;
}

.fab-inner {
  width: 3.25rem;
  height: 3.25rem;
  background: var(--color-income);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px var(--color-income-bg);
  color: white;
}
`;

if (!globalsCss.includes('.tab-bar {')) {
  fs.writeFileSync(globalsCssPath, globalsCss + missingCss, 'utf8');
  console.log('Successfully appended missing BottomTabBar CSS.');
} else {
  console.log('CSS already exists.');
}
