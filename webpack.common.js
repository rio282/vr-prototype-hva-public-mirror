const path = require("path");

module.exports = {
	entry: {
		app: "./js/app.js",
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		clean: true,
		filename: "./js/app.js",
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./")
		}
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader"]
			},
			{
				test: /\.scss$/i,
				use: [
					"style-loader",
					"css-loader",
					{
						loader: "sass-loader",
						options: {
							sassOptions: {
								includePaths: [path.resolve(__dirname, "node_modules")],
							}
						}
					}
				]
			},
			{
				test: /\.(glb|gltf|obj)$/i,
				type: "asset/resource"
			},
			{
				test: /\.(mp3|wav|ogg)$/i,
				type: "asset/resource"
			}
		]
	},
	ignoreWarnings: [
		{
			module: /node_modules/
		}
	]
};
