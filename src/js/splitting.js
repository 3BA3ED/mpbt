import { toHexString, toByteArray, validateField, getBytes } from './helpers';
import { split } from 'shamir-secret-sharing';

import * as bip39 from 'bip39';
import bwipjs from 'bwip-js';

const $secret = document.getElementById('sp_secret');
const $sharesTotal = document.getElementById('sp_sharesTotal');
const $sharesRequired = document.getElementById('sp_sharesRequired');
const $secretHex = document.getElementById('sp_secretHex');
const $outputEncoding = document.getElementById('sp_outputEncoding');
const $code2d = document.getElementById('sp_code2d');

$secret.oninput = function (e) {
	if (e.inputType == 'insertLineBreak') {
		$secret.onchange();
	}
};

$secret.onchange = function () {
	let input = parseInput($secret.value);
	if (!input) {
		$secretHex.hide();
		validateField($secret, false);
		return;
	}

	$secretHex.textContent = toHexString(input);
	$secretHex.show();
	validateField($secret, true);
	populateShares();
	$sharesTotal.focus();
};

function parseInput(text) {
	if (text == '') return;

	try {
		return toByteArray(bip39.mnemonicToEntropy(text.trim()));
	} catch {
		/* empty */
	}
	return getBytes(text) ?? undefined;
}

let shareElements = [];
let shares = [];
async function populateShares() {
	const sharesContainer = document.getElementById('sharesContainer');
	for (const shareElement of shareElements) {
		shareElement.remove();
	}
	shareElements = [];

	let total = +$sharesTotal.value;
	let required = +$sharesRequired.value;

	if (total < required) {
		$sharesTotal.classList.add('is-invalid');
		$sharesRequired.classList.add('is-invalid');
		$sharesTotal.scrollIntoView();
		return;
	} else {
		$sharesTotal.classList.remove('is-invalid');
		$sharesRequired.classList.remove('is-invalid');
	}

	for (let i = 0; i < total; i++) {
		let el = document.createElement('div');
		el.classList.add(...'col-lg-4 col-md-6 mb-2 mb-md-3'.split(' '));
		el.innerHTML = `
			<div class="card">
				<h5 class="card-header">Share ${i + 1}</h5>
				<div class="card-body">
					<div class="input-group mb-2 mb-md-3">
						<input type="text" class="form-control" autocomplete="off" readonly>
						<button class="btn btn-outline-secondary d-flex align-items-center" name="copyCode" type="button">
							<i class="bi-copy"></i>
						</button>
					</div>
					<canvas class="img-thumbnail" style="width: 100%; max-width: 25rem"></canvas>
					<button class="btn btn-primary" name="saveCode" type="button">
						<i class="bi-floppy"></i>
						Save code
					</button>
				</div>
			</div>
        `;

		sharesContainer.append(el);
		shareElements.push(el);

		el.querySelector('button[name="copyCode"]').onclick = function () {
			navigator.clipboard.writeText(el.querySelector('input').value);
			this.children[0].className = '';
			this.children[0].classList.add('bi-clipboard-check');
		};

		el.querySelector('button[name="saveCode"]').onclick = function () {
			const dataURL = el.querySelector('canvas').toDataURL('image/jpeg');
			const a = document.createElement('a');
			a.href = dataURL;
			a.download = 'share' + (i + 1);
			document.body.append(a);
			a.click();
		};
	}

	let secret = parseInput($secret.value);
	if (!secret) return;

	shares = await split(secret, total, required);

	// change shares so the id is in front
	for (let i = 0; i < shares.length; i++) {
		shares[i] = [shares[i].at(-1), ...shares[i].slice(0, -1)];
	}

	updateShares();
}

function updateShares() {
	if (!shares) return;
	for (const [i, el] of shareElements.entries()) {
		if ($outputEncoding.value == 'base64') {
			el.querySelector('input').value = btoa(String.fromCharCode(...shares[i]));
		} else {
			el.querySelector('input').value = toHexString(shares[i]);
		}

		bwipjs.toCanvas(el.querySelector('canvas'), {
			bcid: $code2d.value, // Barcode type
			text: el.querySelector('input').value, // Text to encode
			includetext: false, // Show human-readable text
			backgroundcolor: '#ffffff', // Background color
			showborder: false, // Show a border around the barcode
			scale: 4,
		});
	}
}

$sharesTotal.onchange = $sharesRequired.onchange = populateShares;
$outputEncoding.onchange = $code2d.onchange = updateShares;

await populateShares();
