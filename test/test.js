import colors from 'colors';

function assertValue(val, msg) {
	if (!val) {
		throw new Error('Assertion failed: ' + msg);
	}
}

export default function(name, fn) {
	let assertionCount = 0,
		runTime;
	const assert = {
		false: (a, msg = '') => (assertionCount++, assertValue(a === false, `${msg} ${a} is false`)),
		true: (a, msg = '') => (assertionCount++, assertValue(a === true, `${msg} ${a} is true`)),
		not: (a, b, msg = '') => (assertionCount++, assertValue(a !== b, `${msg} ${a} is not ${b}`)),
		is: (a, b, msg = '') => (assertionCount++, assertValue(a === b, `${msg} ${a} is ${b}`)),
		throws: (fn, type, msg = null) => {
			if (msg === null && type) {
				msg = type;
				type = null;
			}
			let isOk = false;
			try {
				fn();
			} catch(e) {
				if (type && (typeof e.message === 'undefined' && e.indexOf(type) >= 0 || e.message && e.message.indexOf(type) >= 0)) {
					isOk = true;
				} else if (!type) { isOk = true; }
			}
			assertValue(isOk, `${msg} throws exception.`);
		}
	};
	if (typeof fn !== 'function') {
		console.log(`\n${name}`.underline.bold);
		return;
	}
	try {
		runTime = +new Date;
		fn(assert);
		console.log(`√ ${name} (${+new Date - runTime}ms)`.green);
	} catch (e) {
		console.error(`x ${name} (${+new Date - runTime}ms) failed: ${e.message}`.red);
	}
}
