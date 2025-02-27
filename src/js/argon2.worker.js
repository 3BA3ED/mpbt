import { toHexString } from './helpers';

import { default as argon2Factory } from '../../libs/argon2/argon2-nothreads.js';
const argon2nothreads = await argon2Factory();

import argon2Script from '!!raw-loader!../../libs/argon2/argon2.js';
let argon2 = {
	mainScriptUrlOrBlob: new Blob([argon2Script], { type: 'text/javascript' }),
	onRuntimeInitialized: () => {
		argon2.initialized = true;
	},
};

try {
	new Function('Module', argon2Script)(argon2);
} catch (error) {
	// eslint-disable-next-line no-console
	console.log(error);
	argon2 = argon2nothreads;
}

function argon2_hash(argon2, password, salt, m, t, p, argon2_type) {
	// console.log("argon2_hash", toHexString(password), toHexString(salt), m, t, p, argon2_type);

	const version = 0x13;

	const passwordPtr = argon2._malloc(password.length + 1);
	argon2.writeArrayToMemory([...password, 0], passwordPtr);

	const saltPtr = argon2._malloc(salt.length + 1);
	argon2.writeArrayToMemory([...salt, 0], saltPtr);

	const hashlen = 32;
	const hashPtr = argon2._malloc(hashlen);

	try {
		let res = argon2._argon2_hash(
			t,
			m,
			p,
			passwordPtr,
			password.length,
			saltPtr,
			salt.length,
			hashPtr,
			hashlen,
			0,
			0,
			argon2_type,
			version,
		);

		if (res != 0) {
			if (res == -33) {
				postMessage({
					error:
						'Argon2 error: ' +
						argon2.UTF8ToString(argon2._argon2_error_message(res)) +
						' (cross-origin isolation is required to use parallelism in Argon2)',
				});
				return null;
			}
			postMessage({ error: 'Argon2 error: ' + argon2.UTF8ToString(argon2._argon2_error_message(res)) });
			return null;
		}

		let hash = new Uint8Array(argon2.HEAPU8.buffer, hashPtr, hashlen);
		argon2._free(passwordPtr);
		argon2._free(saltPtr);
		argon2._free(hashPtr);

		return hash;
	} catch (error) {
		postMessage({ error: 'Argon2 error: ' + error.toString() });
	}
}

addEventListener('message', event => {
	let module = argon2;
	if (event.data.p == 1 || event.data.p > navigator.hardwareConcurrency || !argon2.initialized)
		module = argon2nothreads;
	let hash = argon2_hash(
		module,
		event.data.password,
		event.data.salt,
		event.data.m,
		event.data.t,
		event.data.p,
		event.data.argon2_type,
	);
	if (hash == null) return;
	postMessage({ result: toHexString(hash) });
});
