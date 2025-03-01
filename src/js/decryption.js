import { toHexString, toByteArray, now, xorArrays, showAlert, validateField, getBytes } from './helpers';
import { deriveArgon2, derivePBKDF2, bench } from './encryption.js';
import { pbkdf2Params, argon2Params, decodeArgon2Parameters, decodePbkdf2Parameters } from './encodings.js';

import * as bip39 from 'bip39';
import bwipjs from 'bwip-js';
import * as qrcode from 'html5-qrcode';

const $de_cypher = document.getElementById('de_cypher');
const $readerContainer = document.getElementById('reader').parentElement.parentElement;
const $de_password = document.getElementById('de_password');
const $de_saltLength = document.getElementById('de_saltLength');
const $de_kdf = document.getElementById('de_kdf');
const $de_paramEncoding = document.getElementById('de_paramEncoding');
const $paramText = document.getElementById('de_paramText');
const $de_argonParameters = document.getElementsByClassName('de_argon-param');
const $de_argonType = document.getElementById('de_argonType');
const $de_argonScaling = document.getElementById('de_argonScaling');
const $de_argonM = document.getElementById('de_argonM');
const $de_argonT = document.getElementById('de_argonT');
const $de_argonP = document.getElementById('de_argonP');
const $de_pbkdfParameters = document.getElementsByClassName('de_pbkdf-param');
const $de_pbkdfI = document.getElementById('de_pbkdfI');
const $de_pbkdfHash = document.getElementById('de_pbkdfHash');
const $de_generateButton = document.getElementById('de_generateKey');
const $generateProgress = document.getElementById('de_generateProgress');
const $generateProgressContainer = $generateProgress.parentElement.parentElement.parentElement;
const $generateProgressText = document.getElementById('de_generateProgressText');
const $de_key = document.getElementById('de_key');
const $de_mnemonic = document.getElementById('de_mnemonic');
const $de_mnemonicHex = document.getElementById('de_mnemonicHex');
const $de_mnemonicLength = document.getElementById('de_mnemonicLength');
const $qrOverlay = document.getElementById('qrOverlay');

document.getElementById('openFile').addEventListener('click', function () {
	// create file input element and prompt user to select a file, print filename to console
	const input = document.createElement('input');
	input.type = 'file';
	// make only imgage files selectable
	input.accept = 'image/*';
	input.multiple = false;

	input.onchange = function () {
		const file = this.files[0];
		// console.log(file.name);
		// run the file through html5-qrcode
		const reader = document.createElement('div');
		reader.id = 'filereader';
		document.body.append(reader);

		const html5QrCode = new qrcode.Html5Qrcode('filereader');
		html5QrCode
			.scanFile(file)
			.then(decodedText => {
				$de_cypher.value = decodedText;
				$de_cypher.classList.toggle('is-invalid', false);
				$de_cypher.onchange();
			})
			.catch(error => {
				showAlert(`Error scanning file: ${error}`);
			})
			.finally(() => {
				reader.remove();
			});
	};
	input.click();
});

let html5Qrcode;
document.getElementById('openScanner').addEventListener('click', function () {
	$readerContainer.show();

	// open qr scanner using html5-qrcode
	html5Qrcode = new qrcode.Html5Qrcode('reader');
	const config = { fps: 10, qrbox: { width: 500, height: 500 } };

	$de_cypher.value = '';
	$de_cypher.classList.toggle('is-valid', false);

	html5Qrcode
		.start({ facingMode: 'environment' }, config, function (decodedText) {
			$de_cypher.value = decodedText;
			html5Qrcode.stop();
			$readerContainer.hide();
			$de_cypher.onchange();
		})
		.catch(error => {
			showAlert(`Error scanning image: ${error}`);
			$readerContainer.hide();
		});
});

document.getElementById('closeScanner').addEventListener('click', function () {
	try {
		html5Qrcode.stop().catch(error => {
			showAlert(`Error stopping scanner: ${error}`);
		});
	} catch (error) {
		showAlert(`Error stopping scanner: ${error}`);
	}
	$readerContainer.hide();
});

let salt, cypher;
$de_cypher.onchange = function () {
	let combinedCypher = getBytes($de_cypher.value);
	if (!combinedCypher) {
		validateField($de_cypher, false);
		$paramText.hide();
		return;
	}

	let saltLength = +$de_saltLength.value;
	salt = new Uint8Array(combinedCypher.buffer, 0, saltLength);

	// set algo fields
	if ($de_kdf.value == 'argon2') {
		let argonType, scale, m, t, p;
		if ($de_paramEncoding.value === 'default') {
			[argonType, scale, m, t, p] = [
				argon2Params.defaults.type,
				2 ** 20,
				argon2Params.defaults.m / 2 ** 20,
				argon2Params.defaults.t,
				argon2Params.defaults.p,
			];
			cypher = new Uint8Array(combinedCypher.buffer, 8);
		} else if ($de_paramEncoding.value === 'decode') {
			[argonType, m, t, p] = decodeArgon2Parameters(new Uint8Array(combinedCypher.buffer, 8, 2));
			scale = 1;
			cypher = new Uint8Array(combinedCypher.buffer, 10);
		} else if ($de_paramEncoding.value === 'none') {
			cypher = new Uint8Array(combinedCypher.buffer, saltLength);
		}

		if ($de_paramEncoding.value != 'none') {
			$de_argonM.value = m;
			$de_argonT.value = t;
			$de_argonP.value = p;
			$de_argonScaling.value = scale;
			$de_argonType.value = argonType;
		}

		if ($de_paramEncoding.value == 'decode') {
			$paramText.textContent = `${['Argon2d', 'Argon2i', 'Argon2id'][argonType]}, ${m / 2 ** 10}MB, ${t} iterations, ${p} lane(s)`;
			$paramText.show();
		} else {
			$paramText.hide();
		}
	} else if ($de_kdf.value == 'pbkdf2') {
		let hash, i;
		if ($de_paramEncoding.value == 'default') {
			[hash, i] = [pbkdf2Params.defaults.hash, pbkdf2Params.defaults.i];
			cypher = new Uint8Array(combinedCypher.buffer, 8);
		} else if ($de_paramEncoding.value == 'decode') {
			[hash, i] = decodePbkdf2Parameters(new Uint8Array(combinedCypher.buffer, 8, 1));
			cypher = new Uint8Array(combinedCypher.buffer, 9);
		} else if ($de_paramEncoding.value == 'none') {
			cypher = new Uint8Array(combinedCypher.buffer, saltLength);
		}

		if ($de_paramEncoding.value != 'none') {
			$de_pbkdfHash.value = hash;
			$de_pbkdfI.value = i;
		}

		if ($de_paramEncoding.value == 'decode') {
			$paramText.show();
			$paramText.textContent = `${['SHA512', 'SHA384', 'SHA256'][hash]}, ${i.toLocaleString('en-US')} iterations`;
		} else {
			$paramText.hide();
		}
	}

	if (cypher.length < 16) {
		validateField($de_cypher, false);
		return;
	} else {
		validateField($de_cypher, true);
	}

	$de_mnemonicLength.value = cypher.length == 32 || cypher.length == 33 ? 32 : 16;
	for (const option of $de_mnemonicLength.options) {
		option.disabled = +option.value > cypher.length;
	}
};

$de_password.onchange = function () {
	validateField($de_password, this.value != '');
};

$de_saltLength.onchange = function () {
	if (this.value != 8) {
		for (const opt of $de_paramEncoding.querySelectorAll('option')) {
			if (opt.value == 'preset' || opt.value == 'plain') {
				opt.disabled = true;
			}
		}
		$de_paramEncoding.value = 'none';
		$de_paramEncoding.onchange();
	} else {
		for (const opt of $de_paramEncoding.querySelectorAll('option')) {
			if (opt.value == 'preset' || opt.value == 'plain') {
				opt.disabled = false;
			}
		}
	}
};

$de_kdf.onchange = function () {
	$de_cypher.onchange();
	updateKdfParams();
};
$de_paramEncoding.onchange = function () {
	$de_cypher.onchange();
	updateKdfParams();
};

function updateKdfParams() {
	for (let e of $de_pbkdfParameters) e.hide();
	for (let e of $de_argonParameters) e.hide();

	if ($de_paramEncoding.value == 'none') {
		if ($de_kdf.value == 'argon2') for (let e of $de_argonParameters) e.show();
		else if ($de_kdf.value == 'pbkdf2') for (let e of $de_pbkdfParameters) e.show();
		$de_saltLength.parentElement.parentElement.parentElement.show();
	} else {
		$de_saltLength.parentElement.parentElement.parentElement.hide();
	}
}

$de_generateButton.onclick = async function () {
	if ($de_cypher.value == '' || !cypher || !salt) {
		validateField($de_cypher, false);
		return;
	}

	if ($de_password.value == '') {
		validateField($de_password, false);
		return;
	}

	let password = new TextEncoder().encode($de_password.value);
	let key;

	let eta = 0;
	if ($de_kdf.value == 'argon2') {
		let t = await bench('argon2');
		eta = (((t * +$de_argonM.value * +$de_argonScaling.value) / 1024) * +$de_argonT.value) / +$de_argonP.value;
	} else if ($de_kdf.value == 'pbkdf2') {
		let t = await bench('pbkdf2');
		let it = $de_pbkdfI.value;
		eta = t * it;
	}

	$de_generateButton.disabled = true;
	$generateProgressContainer.show();
	$generateProgress.style.width = '0%';
	document.getElementById('de_elapsed').textContent = '';

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

	if ($de_kdf.value == 'argon2') {
		key = await deriveArgon2(
			password,
			salt,
			+$de_argonM.value * $de_argonScaling.value,
			+$de_argonT.value,
			+$de_argonP.value,
			+$de_argonType.value,
		);
	} else if ($de_kdf.value == 'pbkdf2') {
		key = await derivePBKDF2(password, salt, +$de_pbkdfI.value, +$de_pbkdfHash.value);
	}

	clearInterval(timer);
	$generateProgress.style.width = '100%';
	$generateProgressText.textContent = '';
	$generateProgressContainer.hide();
	$de_generateButton.disabled = false;
	$de_key.value = '';

	if (!key) return false;

	let elapsed = now() - startTime;
	document.getElementById('de_elapsed').textContent = 'Key generated in ' + (elapsed / 1000).toFixed(3) + ' seconds.';

	$de_key.value = toHexString(key);

	updateMnemonic();
	return false;
};

$de_mnemonicLength.onchange = updateMnemonic;

function updateMnemonic() {
	if ($de_cypher.value == '' || $de_key.value == '') return;

	let key = toByteArray($de_key.value);
	let e = xorArrays(cypher, key);
	let l = Number.parseInt($de_mnemonicLength.value);
	if (e.length > l) e = e.slice(0, l);

	$de_mnemonicHex.textContent = toHexString(e);
	$de_mnemonic.value = bip39.entropyToMnemonic(e);
}

document.getElementById('de_copyMnemonic').addEventListener('click', function () {
	navigator.clipboard.writeText($de_mnemonic.value);
	this.children[0].className = '';
	this.children[0].classList.add('bi-clipboard-check');
});

document.getElementById('de_showQrcode').addEventListener('click', function () {
	if (!$de_mnemonic.value) return;

	$qrOverlay.show();
	$qrOverlay.innerHTML = `
	<canvas id="qrCanvas"></canvas>
    <div class="position-absolute top-0 end-0">
		<i class="bi-x-lg" style="font-size: xx-large; color: grey;"></i>
	</div>`;

	bwipjs.toCanvas(document.getElementById('qrCanvas'), {
		bcid: 'qrcode',
		text: $de_mnemonic.value,
		includetext: false,
		backgroundcolor: '#ffffff',
		showborder: true,
		scale: 3,
	});
});

$qrOverlay.addEventListener('click', function () {
	$qrOverlay.hide();
});
