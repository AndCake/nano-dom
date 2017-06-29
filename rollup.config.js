import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
	entry: 'test/*.js',
	format: 'cjs',
	plugins: [
		multiEntry(),
		babel({
			exclude: 'node_modules/**'
		})
	],
	external: ['colors']
};
