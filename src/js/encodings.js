import { getRandomInt } from './helpers.js';
import { default as encodings } from './encodings.json';
const argon2Params = encodings.argon2Params;
const pbkdf2Params = encodings.pbkdf2Params;

function getTMap(mIdx, pIdx) {
	let cval = argon2Params.c.values;
	let tMap = { values: [], tags: [] };
	for (const [i, element] of cval.entries()) {
		let v = Math.floor((element / argon2Params.m.values[mIdx]) * 2 ** 10 * argon2Params.p.values[pIdx]);
		if (v < 1) v = 1;
		if (tMap.values.length > 0 && v == tMap.values.at(-1)) {
			tMap.tags.at(-1).push(...argon2Params.c.tags[i]);
			continue;
		}
		tMap.values.push(v);
		tMap.tags.push([...argon2Params.c.tags[i]]);
	}
	return tMap;
}

function encodeArgon2Parameters(typeIdx, mIdx, tIdx, pIdx) {
	if (typeIdx > argon2Params.type.values.length) return null;
	if (mIdx > argon2Params.m.values.length) return null;
	if (pIdx > argon2Params.p.values.length) return null;

	let tMap = getTMap(mIdx, pIdx);
	if (tIdx > tMap.values.length) return null;

	let buffer = new Uint8Array(2);

	let typeTag = argon2Params.type.tags[typeIdx][getRandomInt(argon2Params.type.tags[typeIdx].length)];
	let mTag = argon2Params.m.tags[mIdx][getRandomInt(argon2Params.m.tags[mIdx].length)];
	let pTag = argon2Params.p.tags[pIdx][getRandomInt(argon2Params.p.tags[pIdx].length)];
	let cTag = tMap.tags[tIdx][getRandomInt(tMap.tags[tIdx].length)];

	buffer[0] = (typeTag << 5) | cTag;
	buffer[1] = (mTag << 4) | pTag;

	return buffer;
}

function encodePbkdf2Parameters(hashIdx, iIdx) {
	if (hashIdx > pbkdf2Params.hash.values.length) return null;
	if (iIdx > pbkdf2Params.i.values.length) return null;

	let buffer = new Uint8Array(1);

	let hashTag = pbkdf2Params.hash.tags[hashIdx][getRandomInt(pbkdf2Params.hash.tags[hashIdx].length)];
	let iTag = pbkdf2Params.i.tags[iIdx][getRandomInt(pbkdf2Params.i.tags[iIdx].length)];

	buffer[0] = (hashTag << 4) | iTag;

	return buffer;
}

function decodeArgon2Parameters(buffer) {
	if (!buffer || buffer.length < 2) return null;

	const typeTag = buffer[0] >>> 5;
	const cTag = buffer[0] & 0x1f;
	const mTag = buffer[1] >>> 4;
	const pTag = buffer[1] & 0x0f;

	const typeIdx = argon2Params.type.tags.findIndex(tags => tags.includes(typeTag));
	const mIdx = argon2Params.m.tags.findIndex(tags => tags.includes(mTag));
	const pIdx = argon2Params.p.tags.findIndex(tags => tags.includes(pTag));

	if (typeIdx === -1 || mIdx === -1 || pIdx === -1) return null;

	const tMap = getTMap(mIdx, pIdx);
	const tIdx = tMap.tags.findIndex(tags => tags.includes(cTag));

	if (tIdx === -1) return null;

	return [
		argon2Params.type.values[typeIdx],
		argon2Params.m.values[mIdx],
		tMap.values[tIdx],
		argon2Params.p.values[pIdx],
	];
}

function decodePbkdf2Parameters(buffer) {
	if (!buffer || buffer.length === 0) return null;

	const hashTag = buffer[0] >>> 4;
	const iTag = buffer[0] & 0x0f;

	const hashIdx = pbkdf2Params.hash.tags.findIndex(tags => tags.includes(hashTag));
	const iIdx = pbkdf2Params.i.tags.findIndex(tags => tags.includes(iTag));

	if (hashIdx === -1 || iIdx === -1) return null;

	return [pbkdf2Params.hash.values[hashIdx], pbkdf2Params.i.values[iIdx]];
}

export {
	argon2Params,
	pbkdf2Params,
	getTMap,
	encodeArgon2Parameters,
	encodePbkdf2Parameters,
	decodeArgon2Parameters,
	decodePbkdf2Parameters,
};
