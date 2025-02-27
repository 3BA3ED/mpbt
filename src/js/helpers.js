if (typeof Element != 'undefined' && !Element.prototype.hide) {
	Element.prototype.show = function () {
		this.classList.remove('hidden');
	};

	Element.prototype.hide = function () {
		this.classList.add('hidden');
	};
}

function toHexString(x) {
	if (x[Symbol.iterator]) {
		return Array.prototype.map.call(new Uint8Array(x), b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
	} else {
		return x.toString(16);
	}
}

function toByteArray(hexString) {
	if (!/^[0-9a-fA-F]+$/.test(hexString) || hexString.length % 2 !== 0) {
		throw new Error('Invalid hex string');
	}
	let result = [];
	for (let i = 0; i < hexString.length; i += 2) {
		result.push(Number.parseInt(hexString.substr(i, 2), 16));
	}
	return new Uint8Array(result);
}

function xorArrays(a, b) {
	let result = [];
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		result.push(a[i] ^ b[i]);
	}
	return result;
}

function now() {
	return performance ? performance.now() : Date.now();
}

function runInWorker(f, ...args) {
	let code = `
        onmessage = function(e) {
            const ret = (${f.toString()})(...e.data);
            if (ret instanceof Promise) {
                ret.then(r => postMessage(r));
            } else {
                postMessage(ret);
            }
        }
    `;

	let url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
	let worker = new Worker(url);
	let res = new Promise(resolve => {
		worker.addEventListener('message', e => {
			resolve(e.data);
			URL.revokeObjectURL(url);
		});
	});
	worker.postMessage(args);

	return res;
}

function showAlert(message, type = 'danger') {
	const alertElement = document.createElement('div');
	alertElement.innerHTML = `
        <div class="alert alert-${type} alert-dismissible" role="alert" 
            style="overflow-wrap: break-word; margin-top: 1rem; margin-bottom: 0;">
            <div>${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

	// document.body.append(alertElement);
	document.getElementById('alertContainer').append(alertElement);
}

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}

function isMobile() {
	const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
	return regex.test(navigator.userAgent);
}

function getIOSVersion() {
	const userAgent = navigator.userAgent;
	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		const osVersionMatch = userAgent.match(/OS (\d+(_\d+)*)/);
		if (osVersionMatch) {
			const versionString = osVersionMatch[1].replaceAll('_', '.');
			const versionParts = versionString.split('.');

			return {
				major: Number.parseInt(versionParts[0], 10),
				minor: versionParts[1] ? Number.parseInt(versionParts[1], 10) : 0,
			};
		}
	}
	return null;
}

function isWebkit() {
	return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

function validateField(e, valid = true) {
	e.classList.toggle('is-valid', valid);
	e.classList.toggle('is-invalid', !valid);
	if (!valid) e.scrollIntoView();
}

function getBytes(s) {
	if (s.length === 0) return null;
	if (/^[0-9a-f]+$/i.test(s)) {
		if (s.length % 2) return null;
		return toByteArray(s);
	} else {
		try {
			return Uint8Array.from(atob(s), c => c.charCodeAt(0));
		} catch {
			return null;
		}
	}
}

export {
	toHexString,
	toByteArray,
	runInWorker,
	now,
	xorArrays,
	showAlert,
	getRandomInt,
	isMobile,
	isWebkit,
	getIOSVersion,
	validateField,
	getBytes,
};
