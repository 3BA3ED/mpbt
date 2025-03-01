import { showAlert } from './helpers';

import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';

document.getElementById('version').textContent = 'v' + VERSION;

window.addEventListener('online', () => document.getElementById('onlineCheck').show());
window.addEventListener('offline', () => document.getElementById('onlineCheck').hide());
if (navigator.onLine) document.getElementById('onlineCheck').show();

window.addEventListener('error', e => {
	showAlert(`Error: ${e.message} (${e.filename}:${e.lineno})`);
	e.preventDefault();
});

window.addEventListener('unhandledrejection', e => {
	showAlert(`Unhandled promise rejection: ${e.reason}`);
	e.preventDefault();
});

import './encryption.js';
import './decryption.js';
import './splitting.js';
import './combining.js';
