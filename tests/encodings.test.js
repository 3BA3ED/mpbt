import {
	argon2Params,
	pbkdf2Params,
	getTMap,
	encodeArgon2Parameters,
	encodePbkdf2Parameters,
	decodeArgon2Parameters,
	decodePbkdf2Parameters,
} from '../src/js/encodings.js';

test('argon2 decode(encode(...))', () => {
	for (let typeIdx = 0; typeIdx < argon2Params.type.values.length; typeIdx++) {
		for (let mIdx = 0; mIdx < argon2Params.m.values.length; mIdx++) {
			for (let pIdx = 0; pIdx < argon2Params.p.values.length; pIdx++) {
				for (let tIdx = 0; tIdx < getTMap(mIdx, pIdx).values.length; tIdx++) {
					let buf = encodeArgon2Parameters(typeIdx, mIdx, tIdx, pIdx);
					expect(buf).not.toBeNull();
					expect(buf.length).toBe(2);

					let [type, m, t, p] = decodeArgon2Parameters(buf);
					expect(type).toBe(argon2Params.type.values[typeIdx]);
					expect(m).toBe(argon2Params.m.values[mIdx]);
					expect(t).toBe(getTMap(mIdx, pIdx).values[tIdx]);
					expect(p).toBe(argon2Params.p.values[pIdx]);
				}
			}
		}
	}
});

test('argon2 decode(...)', () => {
	for (let i = 0; i < 256; i++) {
		for (let j = 0; j < 256; j++) {
			let buf = new Uint8Array([i, j]);
			let [type, m, t, p] = decodeArgon2Parameters(buf);
			expect([0, 1, 2].includes(type)).toBe(true);
			expect([102400, 204800, 512000, 1024000, 1536000, 2048000, 3072000, 4096000].includes(m)).toBe(true);
			expect(t).toBeGreaterThanOrEqual(1);
			expect(t).toBeLessThanOrEqual(20480);
			expect([1, 2, 4, 6, 8, 12, 16].includes(p)).toBe(true);
		}
	}
});

test('pbkdf2 decode(encode(...))', () => {
	for (let hashIdx = 0; hashIdx < pbkdf2Params.hash.values.length; hashIdx++) {
		for (let iIdx = 0; iIdx < pbkdf2Params.i.values.length; iIdx++) {
			let buf = encodePbkdf2Parameters(hashIdx, iIdx);
			expect(buf).not.toBeNull();
			expect(buf.length).toBe(1);

			let [hash, i] = decodePbkdf2Parameters(buf);
			expect(hash).toBe(pbkdf2Params.hash.values[hashIdx]);
			expect(i).toBe(pbkdf2Params.i.values[iIdx]);
		}
	}
});

test('pbkdf2 decode(...)', () => {
	for (let i = 0; i < 256; i++) {
		let buf = new Uint8Array([i]);
		let [hash, i] = decodePbkdf2Parameters(buf);
		expect([0, 1, 2].includes(hash)).toBe(true);
		expect([1000000, 2000000, 5000000, 20000000, 50000000, 100000000, 200000000, 500000000, 1000000000].includes(i)).toBe(true);
	}
});
