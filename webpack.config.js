const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	mode: 'none',
	performance: false,
	resolve: {
		fallback: {
			fs: false,
			tls: false,
			net: false,
			path: false,
			zlib: false,
			http: false,
			https: false,
			stream: false,
			crypto: false,
			process: false,
			worker_threads: false,
		},
	},
	plugins: [
		new NodePolyfillPlugin({
			onlyAliases: ['Buffer'],
		}),
		new HtmlBundlerPlugin({
			filename: 'mpbt.html',
			entry: {
				index: 'src/index.html',
			},
			js: {
				inline: { enabled: true, source: 'main.js' },
			},
			css: {
				inline: true,
			},
		}),
		new webpack.DefinePlugin({
			VERSION: JSON.stringify(require('./package.json').version),
		}),
	],
	module: {
		rules: [
			{
				test: /\.(css|sass|scss)$/,
				use: ['css-loader', 'sass-loader'],
			},
			{
				test: /\.(png|jpe?g|webp|svg|woff2?)$/i,
				type: 'asset/inline',
			},
			{
				test: /\.worker\.js$/,
				loader: 'worker-loader',
				options: {
					inline: 'no-fallback',
				},
			},
		],
	},
	devServer: {
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		},
	},
};
