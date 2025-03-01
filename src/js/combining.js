import { toHexString, getBytes, showAlert } from './helpers';
import { combine } from 'shamir-secret-sharing';

import * as bip39 from 'bip39';
import bwipjs from 'bwip-js';
import * as qrcode from 'html5-qrcode';

const $numShares = document.getElementById('re_sharesNumber');
const $sharesContainer = document.getElementById('re_sharesContainer');
const $outputEncoding = document.getElementById('re_outputEncoding');
const $mnemonicLength = document.getElementById('re_mnemonicLength');
const $secret = document.getElementById('re_secret');
const $qrOverlay = document.getElementById('qrOverlay');

$numShares.onchange = updateShares;
let shareElements = [];
function updateShares() {
	for (const shareElement of shareElements) {
		shareElement.remove();
	}
	shareElements = [];

	for (let i = 0; i < +$numShares.value; i++) {
		let el = document.createElement('div');
		el.classList.add(...'row mb-2 mb-md-3'.split(' '));
		el.innerHTML = `
			<label class="col-md-2 col-form-label fw-bold" for="re_share${i + 1}">Share ${i + 1}</label>
			<div class="col-md-10">
				<div class="input-group">
					<input type="text" class="form-control" id="re_share${i + 1}" autocomplete="off">
					<button class="btn btn-outline-secondary d-flex align-items-center" name="openFile" type="button">
						<i class="bi bi-folder2-open"></i>
					</button>
					<button class="btn btn-outline-secondary d-flex align-items-center" name="openScanner" type="button">
						<i class="bi bi-qr-code-scan"></i>
					</button>
				</div>
			</div>
			<div class="col-sm offset-sm-2 mt-3 position-relative hidden" style="min-height: 2rem">
				<div name="reader" id="reader${i}"></div>
				<i
					class="bi bi-x-lg position-absolute top-0"
					name="closeScanner"
					style="right: 1rem; font-size: xx-large; color: grey"></i>
			</div>
		`;

		$sharesContainer.append(el);
		shareElements.push(el);

		el.querySelector('input').onchange = updateSecret;

		el.querySelector('button[name="openFile"]').onclick = function () {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = false;
			input.onchange = function () {
				const file = this.files[0];
				const reader = document.createElement('div');
				reader.id = 'filereader';
				document.body.append(reader);

				const html5QrCode = new qrcode.Html5Qrcode('filereader');
				html5QrCode
					.scanFile(file)
					.then(decodedText => {
						const shareInput = el.querySelector('input');
						shareInput.value = decodedText;
						shareInput.classList.toggle('is-invalid', false);
						shareInput.onchange();
					})
					.catch(error => {
						showAlert(`Error scanning file: ${error}`);
					})
					.finally(() => {
						reader.remove();
					});
			};
			input.click();
		};

		let html5Qrcode;
		el.querySelector('button[name="openScanner"]').onclick = function () {
			const readerElement = el.querySelector('div[name="reader"]');
			readerElement.parentElement.show();

			const shareInput = el.querySelector('input');
			// open qr scanner using html5-qrcode
			html5Qrcode = new qrcode.Html5Qrcode(readerElement.id);
			const config = { fps: 10, qrbox: { width: 500, height: 500 } };

			shareInput.value = '';
			shareInput.classList.toggle('is-valid', false);

			html5Qrcode
				.start({ facingMode: 'environment' }, config, function (decodedText) {
					shareInput.value = decodedText;
					html5Qrcode.stop();
					readerElement.parentElement.hide();
					shareInput.onchange();
				})
				.catch(error => {
					showAlert(`Error scanning image: ${error}`);
					readerElement.parentElement.hide();
				});
		};

		el.querySelector('i[name="closeScanner"]').onclick = function () {
			try {
				html5Qrcode.stop().catch(error => {
					showAlert(`Error stopping scanner: ${error}`);
				});
			} catch (error) {
				showAlert(`Error stopping scanner: ${error}`);
			}
			const readerElement = el.querySelector('div[name="reader"]');
			readerElement.parentElement.hide();
		};
	}
}
updateShares();

let secret;
async function updateSecret() {
	let shares = [];
	for (const el of shareElements) {
		let v = el.querySelector('input').value;
		if (!v) return;

		let share = getBytes(v);
		// move the id to the back
		share = new Uint8Array([...share.slice(1), share[0]]);
		shares.push(share);
	}

	secret = await combine(shares);

	if (secret.length == 16) {
		$outputEncoding.value = 'mnemonic';
		$mnemonicLength.parentElement.parentElement.show();
		$mnemonicLength.value = 16;
	} else if (secret.length == 32) {
		$outputEncoding.value = 'mnemonic';
		$mnemonicLength.parentElement.parentElement.show();
		$mnemonicLength.value = 32;
	}
	for (const option of $mnemonicLength.options) {
		option.disabled = +option.value > secret.length;
	}

	updateOutput();
}

$outputEncoding.onchange = function () {
	if ($outputEncoding.value == 'mnemonic') $mnemonicLength.parentElement.parentElement.show();
	else $mnemonicLength.parentElement.parentElement.hide();
	updateOutput();
};

function updateOutput() {
	if ($outputEncoding.value == 'base64') {
		$secret.value = btoa(String.fromCharCode(...secret));
	} else if ($outputEncoding.value == 'hex') {
		$secret.value = toHexString(secret);
	} else if ($outputEncoding.value == 'mnemonic') {
		secret = secret.slice(0, +$mnemonicLength.value);
		$secret.value = bip39.entropyToMnemonic(toHexString(secret));
	}
}

$mnemonicLength.onchange = updateSecret;

document.getElementById('re_copySecret').addEventListener('click', function () {
	navigator.clipboard.writeText($secret.value);
	this.children[0].className = '';
	this.children[0].classList.add('bi-clipboard-check');
});

document.getElementById('re_showQrcode').addEventListener('click', function () {
	if (!$secret.value) return;

	$qrOverlay.show();
	$qrOverlay.innerHTML = `
	<canvas id="qrCanvas"></canvas>
	<div class="position-absolute top-0 end-0">
		<i class="bi-x-lg" style="font-size: xx-large; color: grey;"></i>
	</div>`;

	bwipjs.toCanvas(document.getElementById('qrCanvas'), {
		bcid: 'qrcode',
		text: $secret.value,
		includetext: false,
		backgroundcolor: '#ffffff',
		showborder: true,
		scale: 3,
	});
});

document.getElementById('sendToDecrypt').onclick = function () {
	document.getElementById('de_cypher').value = $secret.value;
	document.getElementById('de_cypher').onchange();
	document.getElementById('decryptTab').click();
};
