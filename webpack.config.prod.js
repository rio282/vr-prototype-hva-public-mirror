const path = require("path");
const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
	mode: "production",

	entry: "./js/app.js",

	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "js/[name].[contenthash].js",
		publicPath: "/",
		clean: true,
	},

	plugins: [
		// --- HTML PAGES ---
		new HtmlWebpackPlugin({
			template: "./index.html",
			filename: "index.html",
			chunks: ["main"],
		}),
		new HtmlWebpackPlugin({
			template: "./kitchen.html",
			filename: "kitchen.html",
			chunks: ["main"],
		}),
		new HtmlWebpackPlugin({
			template: "./grocery-store.html",
			filename: "grocery-store.html",
			chunks: ["main"],
		}),

		// --- STATIC FILES ---
		new CopyPlugin({
			patterns: [
				// core assets
				{from: "img", to: "img"},
				{from: "css", to: "css"},
				{from: "js/vendor", to: "js/vendor"},

				// large feature folders (CRITICAL)
				{from: "_kitchen", to: "_kitchen"},
				{from: "aframe", to: "aframe"},

				// root static files
				{from: "favicon.ico", to: "favicon.ico"},
				{from: "robots.txt", to: "robots.txt"},
				{from: "404.html", to: "404.html"},
				{from: "site.webmanifest", to: "site.webmanifest"},
				{from: "LICENSE.txt", to: "LICENSE.txt"},
			],
		}),
	],
});
