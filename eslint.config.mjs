import globals from 'globals';
import eslintJs from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import stylisticJs from '@stylistic/eslint-plugin-js';
import html from '@html-eslint/eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
	eslintJs.configs.recommended,
	sonarjs.configs.recommended,
	eslintPluginUnicorn.configs['flat/recommended'],
	eslintPluginPrettierRecommended,
	{ ...html.configs['flat/recommended'], files: ['**/*.html'] },
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2021,
				VERSION: 'readonly',
			},
		},
		plugins: {
			'@stylistic/js': stylisticJs,
		},
		rules: {
			'unicorn/prefer-query-selector': 'off',
			'unicorn/prefer-add-event-listener': 'off',
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/no-negated-condition': 'off',
			'unicorn/prefer-code-point': 'off',
			'unicorn/prefer-global-this': 'off',
			'unicorn/no-null': 'off',
			'unicorn/prefer-dom-node-dataset': 'off',
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-switch': 'off',
			'unicorn/prefer-string-slice': 'off',
			'unicorn/number-literal-case': 'off',

			'sonarjs/cognitive-complexity': 'off',
			'sonarjs/pseudo-random': 'off',
			'sonarjs/code-eval': 'off',

			'@stylistic/js/no-trailing-spaces': 'error',
			'@stylistic/js/quotes': ['error', 'single'],
			'@stylistic/js/semi': ['error', 'always'],
			'@stylistic/js/object-curly-spacing': ['error', 'always'],
			'@stylistic/js/array-bracket-spacing': ['error', 'never'],
			'@stylistic/js/comma-dangle': ['error', 'always-multiline'],
			'@stylistic/js/arrow-parens': ['error', 'as-needed'],

			'no-console': 'warn',

			'@html-eslint/indent': 'off',
			'@html-eslint/attrs-newline': 'off',
		},
	},
];
