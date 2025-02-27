import { Tooltip } from 'bootstrap';
import {
	toHexString,
	toByteArray,
	runInWorker,
	now,
	xorArrays,
	showAlert,
	validateField,
	getIOSVersion,
} from './helpers.js';
import { argon2Params, getTMap, pbkdf2Params, encodeArgon2Parameters, encodePbkdf2Parameters } from './encodings.js';

import * as bip39 from 'bip39';
import bwipjs from 'bwip-js';

import { default as ArgonWorker } from './argon2.worker.js';
const argon2worker = new ArgonWorker();

const $password = document.getElementById('password');
const $passwordHex = document.getElementById('passwordHex');
const $salt = document.getElementById('salt');
document.getElementById('refreshSalt').onclick = refreshSalt;
const $kdf = document.getElementById('kdf');
const $paramEncoding = document.getElementById('paramEncoding');

const $argonParameters = document.getElementsByClassName('argon-param');
const $argonRanges = document.getElementsByClassName('argon-range');
const $argonType = document.getElementById('argonType');
const $argonScaling = document.getElementById('argonScaling');
const $argonM = document.getElementById('argonM');
const $argonT = document.getElementById('argonT');
const $argonP = document.getElementById('argonP');
const $argonMrange = document.getElementById('argonMrange');
const $argonTrange = document.getElementById('argonTrange');
const $argonPrange = document.getElementById('argonPrange');
const $argonMvalue = document.getElementById('argonMvalue');
const $argonTvalue = document.getElementById('argonTvalue');
const $argonPvalue = document.getElementById('argonPvalue');

const $pbkdfParameters = document.getElementsByClassName('pbkdf-param');
const $pbkdfRanges = document.getElementsByClassName('pbkdf-range');
const $pbkdfHash = document.getElementById('pbkdfHash');
const $pbkdfI = document.getElementById('pbkdfI');
const $pbkdfIrange = document.getElementById('pbkdfIrange');
const $pbkdfIvalue = document.getElementById('pbkdfIvalue');

const $generateButton = document.getElementById('generateKey');
const $generateProgress = document.getElementById('generateProgress');
const $generateProgressContainer = $generateProgress.parentElement.parentElement.parentElement;
const $generateProgressText = document.getElementById('generateProgressText');
const $encryptionKey = document.getElementById('encryptionKey');
const $mnemonic = document.getElementById('mnemonic');
const $mnemonicHex = document.getElementById('mnemonicHex');
const $padding = document.getElementById('padding');
const $outputEncoding = document.getElementById('outputEncoding');
const $cypher = document.getElementById('cypher');
const $cypher2d = document.getElementById('cypher2d');
const $code2d = document.getElementById('code2d');
const $saveCode = document.getElementById('saveCode');

$password.addEventListener('input', function () {
	if (this.value != '') {
		let v = toHexString(new TextEncoder().encode(this.value));
		if (v.length > 128) {
			v = v.slice(0, 128) + '...';
		}
		$passwordHex.textContent = v;
		$passwordHex.show();
	} else {
		$passwordHex.textContent = '';
		$passwordHex.hide();
	}
});

$password.onchange = function () {
	validateField($password, this.value != '');
};

function updateKdfParams() {
	for (let e of $argonParameters) e.hide();
	for (let e of $pbkdfParameters) e.hide();
	for (let e of $argonRanges) e.hide();
	for (let e of $pbkdfRanges) e.hide();

	let ok = true;
	try {
		toByteArray($salt.value);
	} catch {
		ok = false;
	}
	if (!ok) {
		showAlert('Salt must be a proper hex value');
		$salt.classList.add('is-invalid');
	} else {
		$salt.classList.remove('is-invalid');
	}

	if ($salt.value.length != 16) {
		$paramEncoding.disabled = true;
		$paramEncoding.value = 'none';
	} else {
		$paramEncoding.disabled = false;
	}

	if ($paramEncoding.value == 'encode') {
		if ($kdf.value == 'argon2') for (let e of $argonRanges) e.show();
		else if ($kdf.value == 'pbkdf2') for (let e of $pbkdfRanges) e.show();
	} else if ($paramEncoding.value == 'none') {
		if ($kdf.value == 'argon2') for (let e of $argonParameters) e.show();
		else if ($kdf.value == 'pbkdf2') for (let e of $pbkdfParameters) e.show();
	} else {
		// setDefaults();
	}

	$encryptionKey.value = '';

	$padding.value = $kdf.value == 'pbkdf2' && $paramEncoding.value == 'encode' ? 1 : 0;
}

$salt.onchange = $kdf.onchange = $paramEncoding.onchange = updateKdfParams;

let tVal;
function updateTValues() {
	tVal = getTMap(+$argonMrange.value, +$argonPrange.value).values;
	$argonTrange.max = tVal.length - 1;
	$argonTvalue.textContent = tVal[+$argonTrange.value];
}
updateTValues();

$argonMrange.oninput = function () {
	$argonMvalue.textContent = argon2Params.m.values[+$argonMrange.value] / 2 ** 10 + ' MB';
};
$argonMrange.oninput();
$argonTrange.oninput = function () {
	$argonTvalue.textContent = tVal[+$argonTrange.value];
};
$argonPrange.oninput = function () {
	$argonPvalue.textContent = argon2Params.p.values[+$argonPrange.value];
};
$argonPrange.oninput();

$argonMrange.onchange = function () {
	updateTValues();
	$encryptionKey.value = '';
};
$argonTrange.onchange = function () {
	$encryptionKey.value = '';
};
$argonPrange.onchange = function () {
	let p = argon2Params.p.values[+$argonPrange.value];
	if (p > navigator.hardwareConcurrency) {
		for (let i = argon2Params.p.values.length - 1; i >= 0; i--) {
			p = argon2Params.p.values[i];
			if (p <= navigator.hardwareConcurrency) {
				$argonPrange.value = i;
				break;
			}
		}
	}

	$argonPvalue.textContent = p;
	updateTValues();
	$encryptionKey.value = '';
};

$pbkdfIrange.oninput = function () {
	let v = pbkdf2Params.i.values[+$pbkdfIrange.value];
	$pbkdfIvalue.textContent = v.toLocaleString('en-US');
};
$pbkdfIrange.oninput();
$pbkdfIrange.onchange = function () {
	$encryptionKey.value = '';
};

$argonMrange.max = argon2Params.m.values.length - 1;
$argonPrange.max = argon2Params.p.values.length - 1;
$pbkdfIrange.max = pbkdf2Params.i.values.length - 1;

let argonScalingPrev = 2 ** 20;
$argonScaling.onchange = function () {
	// console.log($argonScaling.value, typeof $argonScaling.value);
	switch ($argonScaling.value) {
		case '1048576': {
			$argonM.value = Math.trunc((+$argonM.value * argonScalingPrev) / 2 ** 20);
			argonScalingPrev = 2 ** 20;
			break;
		}
		case '1024': {
			$argonM.value = Math.trunc((+$argonM.value * argonScalingPrev) / 2 ** 10);
			argonScalingPrev = 2 ** 10;
			break;
		}
		case '1': {
			$argonM.value *= argonScalingPrev;
			argonScalingPrev = 1;
			break;
		}
	}
};

$argonP.onchange = function () {
	if ($argonP.value > navigator.hardwareConcurrency) $argonP.value = navigator.hardwareConcurrency;
};

$generateButton.onclick = async function () {
	if ($password.value == '') {
		validateField($password, false);
		return false;
	}

	let password = new TextEncoder().encode($password.value);
	let key;

	$argonMrange.disabled = true;
	$argonTrange.disabled = true;
	$argonPrange.disabled = true;
	$pbkdfIrange.disabled = true;

	let argonType = $argonType.value,
		argonM,
		argonT,
		argonP,
		pbkdfHash = $pbkdfHash.value,
		pbkdfI;
	if ($paramEncoding.value == 'default') {
		argonType = argon2Params.defaults.type;
		argonM = argon2Params.defaults.m;
		argonT = argon2Params.defaults.t;
		argonP = argon2Params.defaults.p;
		pbkdfHash = pbkdf2Params.defaults.hash;
		pbkdfI = pbkdf2Params.defaults.i;
	} else if ($paramEncoding.value == 'encode') {
		argonM = argon2Params.m.values[+$argonMrange.value];
		argonT = tVal[+$argonTrange.value];
		argonP = argon2Params.p.values[+$argonPrange.value];
		pbkdfI = pbkdf2Params.i.values[+$pbkdfIrange.value];
	} else if ($paramEncoding.value == 'none') {
		argonM = +$argonM.value * +$argonScaling.value;
		argonT = +$argonT.value;
		argonP = +$argonP.value;
		pbkdfI = +$pbkdfI.value;
	}

	let eta = 0;
	try {
		if ($kdf.value == 'argon2') {
			let t = await bench('argon2');
			eta = (((t * argonM) / 1024) * argonT) / argonP;
			// console.log(t, "seconds per iteration megabyte", eta, "seconds eta");
		} else if ($kdf.value == 'pbkdf2') {
			let t = await bench('pbkdf2');
			eta = t * pbkdfI;
			if (pbkdfHash == 2) eta /= 3.5;
			// console.log(t, "seconds per iteration", eta, "seconds eta");
		}
	} catch (error) {
		showAlert(error.message);
		return;
	}

	$generateButton.disabled = true;
	$generateProgressContainer.show();
	$generateProgress.style.width = '0%';
	document.getElementById('elapsed').textContent = '';

	let startTime = now();
	let timer = setInterval(() => {
		let elapsed = (now() - startTime) / 1000;
		let remaining = eta - elapsed;
		if (remaining < 0) {
			$generateProgressText.textContent = 'almost done...';
			$generateProgress.style.width = '99%';
		} else {
			let percent = (elapsed / eta) * 100;
			let seconds = Math.trunc(remaining);
			let minutes = Math.trunc(seconds / 60);
			$generateProgressText.textContent = minutes + ':' + String(seconds - minutes * 60).padStart(2, '0');
			$generateProgress.style.width = percent + '%';
		}
	}, 200);

	let wakeLock;
	try {
		wakeLock = await navigator.wakeLock.request('screen');
	} catch {
		// showAlert(e.toString());
	}

	localStorage.setItem('running', '1');

	try {
		if ($kdf.value == 'argon2') {
			key = await deriveArgon2(password, toByteArray($salt.value), argonM, argonT, argonP, argonType);
		} else if ($kdf.value == 'pbkdf2') {
			key = await runInWorker(derivePBKDF2, password, toByteArray($salt.value), pbkdfI, pbkdfHash);
		}
	} catch (error) {
		showAlert(error.message);
	}

	localStorage.removeItem('running');

	clearInterval(timer);
	wakeLock?.release().then(() => {
		wakeLock = undefined;
	});
	$generateProgress.style.width = '100%';
	$generateProgressText.textContent = '';
	$generateProgressContainer.hide();
	$generateButton.disabled = false;
	$encryptionKey.value = '';

	$argonMrange.disabled = false;
	$argonTrange.disabled = false;
	$argonPrange.disabled = false;
	$pbkdfIrange.disabled = false;

	if (!key) return;

	let elapsed = now() - startTime;
	document.getElementById('elapsed').textContent = 'Key generated in ' + (elapsed / 1000).toFixed(3) + ' seconds.';

	$encryptionKey.value = toHexString(key);
	if ($mnemonic.value != '') updateCypher();

	return false;
};

$mnemonic.oninput = function (e) {
	if (e.inputType == 'insertLineBreak') {
		$cypher.focus();
	}
};

$mnemonic.onchange = function () {
	let entropy;
	try {
		entropy = bip39.mnemonicToEntropy($mnemonic.value.trim());
	} catch {
		$mnemonicHex.hide();
		$cypher.value = '';
		$code2d.onchange();
		validateField($mnemonic, false);
		return;
	}

	$mnemonicHex.textContent = entropy;
	$mnemonicHex.show();
	validateField($mnemonic, true);
	updateCypher();
	$cypher.focus();
};

function updateCypher() {
	if (!$mnemonic.value) {
		$mnemonic.scrollIntoView();
		$cypher.value = '';
		return;
	}

	let entropy = '';
	try {
		entropy = bip39.mnemonicToEntropy($mnemonic.value.trim());
	} catch {
		$mnemonicHex.hide();
		validateField($mnemonic, false);
		$cypher.value = '';
		$cypher.onchange();
		return;
	}

	if ($encryptionKey.value == '') return;

	let m = toByteArray(entropy);
	let k = toByteArray($encryptionKey.value);

	if (k.length < m.length) return;

	let x = xorArrays(m, k);

	let pad;
	if (+$padding.value == 0) {
		pad = '';
	} else {
		let rng = new Uint8Array(+$padding.value);
		crypto.getRandomValues(rng);
		pad = toHexString(rng);
	}

	let output;
	if ($paramEncoding.value == 'encode') {
		if ($kdf.value == 'argon2') {
			let buffer = encodeArgon2Parameters(
				+$argonType.value,
				+$argonMrange.value,
				+$argonTrange.value,
				+$argonPrange.value,
			);
			// buffer = xorArrays(buffer, toByteArray($salt.value));
			output = $salt.value + toHexString(buffer) + toHexString(x) + pad;
		} else if ($kdf.value == 'pbkdf2') {
			let buffer = encodePbkdf2Parameters(+$pbkdfHash.value, +$pbkdfIrange.value);
			// buffer = xorArrays(buffer, toByteArray($salt.value));
			output = $salt.value + toHexString(buffer) + toHexString(x) + pad;
		}
	} else {
		output = $salt.value + toHexString(x) + pad;
	}

	if ($outputEncoding.value == 'base64') {
		$cypher.value = btoa(String.fromCharCode(...toByteArray(output)));
	} else if ($outputEncoding.value == 'hex') {
		$cypher.value = output;
	}

	$code2d.onchange();
}

$padding.addEventListener('change', function () {
	updateCypher();
});

document.getElementById('copyCypher').onclick = function () {
	if ($cypher.value == '') return;
	navigator.clipboard.writeText($cypher.value);
	this.children[0].className = '';
	this.children[0].classList.add('bi-clipboard-check');
};

$outputEncoding.onchange = function () {
	updateCypher();
};

$code2d.onchange = function () {
	if ($cypher.value == '') {
		$cypher2d.hide();
		return;
	}

	$cypher2d.show();
	$saveCode.show();

	bwipjs.toCanvas($cypher2d, {
		bcid: $code2d.value, // Barcode type
		text: $cypher.value, // Text to encode
		includetext: false, // Show human-readable text
		backgroundcolor: '#ffffff', // Background color
		showborder: false, // Show a border around the barcode
		scale: 4,
	});
};

$saveCode.onclick = function () {
	const dataURL = $cypher2d.toDataURL('image/png');
	const a = document.createElement('a');
	a.href = dataURL;
	a.download = $salt.value.slice(0, 6);
	document.body.append(a);
	a.click();
};

/**
 * Measures the time taken to derive a cryptographic key using the specified
 * key derivation function (KDF) and returns the average time per iteration
 * in seconds. Also checks if the hashes are calculated as expected.
 */
async function bench(kdf) {
	const passwd = new TextEncoder().encode('password');
	const salt = new TextEncoder().encode('somesalt');
	let start = now();

	if (kdf == 'argon2') {
		let i1 = 10;
		let i2 = 100;

		let key = await deriveArgon2(passwd, salt, 1024, i1, 1, 0);
		if (toHexString(key) != 'f38afe1266d247cf1f6f836ffdbb0ab946c0a7edbcb4ba6e7324b32b9050441e') {
			showAlert('sanity check failed');
		}
		let t1 = now() - start;

		start = now();
		await deriveArgon2(passwd, salt, 1024, i2, 1, 0);
		let t2 = now() - start;

		let ti = (t1 - t2) / (i1 - i2);
		// console.log(ti);
		return (ti / 1000) * 1.4;
	} else if (kdf == 'pbkdf2') {
		let i1 = 1000;
		let i2 = 10_000;

		let key = await derivePBKDF2(passwd, salt, i1, 0);
		if (toHexString(key) != 'a40ad3b13f006a1cf1988e4e65cc4a370da8e25f6a88ac1ce736d647c6e8f3dd') {
			showAlert('sanity check failed');
		}
		let t1 = now() - start;

		start = now();
		await derivePBKDF2(passwd, salt, i2, 0);
		let t2 = now() - start;
		let ti = (t1 - t2) / (i1 - i2);
		return (ti / 1000) * 1.6;
	}
}

function refreshSalt() {
	$salt.value = toHexString(crypto.getRandomValues(new Uint8Array(8)));
	$salt.onchange();
	$encryptionKey.value = '';
}

async function derivePBKDF2(password, salt, i, hash) {
	try {
		const passwordKey = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);

		hash = ['SHA-512', 'SHA-384', 'SHA-256', 'SHA-512'][+hash];
		// console.log("derive pbkdf2", password, salt, +i, hash);

		const derviedBytes = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				hash: hash,
				salt,
				iterations: +i,
			},
			passwordKey,
			256,
		);

		return new Uint8Array(derviedBytes);
	} catch (error) {
		showAlert(error.toString());
	}
}

async function deriveArgon2(password, salt, m, t, p, argon2_type) {
	// console.log("derive argon2", password, salt, m, t, p, argon2_type);
	let res = new Promise((resolve, reject) => {
		argon2worker.onmessage = event => {
			if (event.data.error) {
				reject(new Error(event.data.error));
			} else {
				resolve(toByteArray(event.data.result));
			}
		};
		argon2worker.onerror = event => {
			reject(new Error('Argon2 worker error: ' + event.message + ' (' + event.lineno + ':' + event.colno + ')'));
			return false;
		};
	});

	argon2worker.postMessage({
		method: 'argon2_hash',
		password: password,
		salt: salt,
		m: m,
		t: t,
		p: p,
		argon2_type: argon2_type,
	});

	return res;
}

if (document.readyState === 'complete' || document.readyState === 'interactive') init();
else document.addEventListener('DOMContentLoaded', init);

function init() {
	refreshSalt();

	if (!window.crypto.getRandomValues && !window.isSecureContext) {
		showAlert('Secure context is required', 'error');
		return;
	}

	if (!WebAssembly) {
		showAlert('WebAssembly unavailable', 'warning');
		$kdf.value = 'pbkdf2';
		$kdf.onchange();
		$kdf.disabled = true;
	}

	if (!crypto || !crypto.subtle) {
		showAlert('SubtleCrypto unavailable', 'warning');
		$kdf.value = 'argon2';
		$kdf.onchange();
		$kdf.disabled = true;
	}

	if (!crossOriginIsolated) {
		// showAlert("Argon2 parallelism requires cross-origin isolation", "warning");
		$argonP.readOnly = true;
		$argonP.value = 1;
		$argonP.setAttribute('data-bs-toggle', 'tooltip');
		$argonP.setAttribute('data-bs-placement', 'top');
		$argonP.setAttribute('title', 'Argon2 parallelism requires cross-origin isolation');

		$argonPrange.disabled = true;
		$argonPrange.value = 0;
	}

	if (localStorage.getItem('running')) {
		localStorage.removeItem('running');
		showAlert(
			'Last key derivation did not complete. If the page has crashed, try reducing the Memory parameter',
			'info',
		);
	}

	const iosVersion = getIOSVersion();
	if (iosVersion && iosVersion.major < 18 && !localStorage.getItem('webkitWarning')) {
		showAlert(
			`Webkit-based browsers have lacking support for latest web features. 
			It is recommended to update your system to the latest version, or upgrade to an android device.`,
			'warning',
		);
		localStorage.setItem('webkitWarning', 1);
	}

	let tooltipTriggerList = Array.prototype.slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
	tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new Tooltip(tooltipTriggerEl);
	});
}

export { deriveArgon2, derivePBKDF2, bench };
