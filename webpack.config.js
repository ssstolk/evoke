const path = require("path");
const webpack = require("webpack");
const HtmlPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { GitRevisionPlugin } = require("git-revision-webpack-plugin");

const appGitVersion = new GitRevisionPlugin().version();

module.exports = function(env) {
    env = env || {};
    const isProduction = !!env.prod;
    const isDevBuild = !isProduction;

    console.log("Building app bundle with webpack");
    console.log("    production mode:" + isProduction);

    const webpackConfig = {
        mode: isProduction ? "production" : "development",
        entry: {
            app: "./app/app.tsx"
        },

        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            modules: [__dirname, "node_modules"],
            fallback: {
                fs: false,
                buffer: require.resolve("buffer"),
                crypto: false,
                stream: require.resolve("stream-browserify"),
                util: false
            }
        },

        output: {
            path: path.join(__dirname, "/dist")
        },

        optimization: {
            splitChunks: { chunks: "all" }
        },

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader"
                },
                {
                    test: /\.(png|jpg|jpeg|gif|svg|woff)$/,
                    use: "url-loader"
                },
                { test: /\.(html|txt|sparql)$/, use: "raw-loader" },
                { test: /\.css$/, use: ["style-loader", "css-loader"] },
                { test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"] }
            ]
        },

        plugins: [
            // Work around for "Buffer is undefined" ( https://github.com/webpack/changelog-v5/issues/10 )
            new webpack.ProvidePlugin({
                Buffer: ["buffer", "Buffer"]
            }),
            new webpack.ProvidePlugin({
                process: "process/browser"
            }),

            new CleanWebpackPlugin({ verbose: true }),

            new CopyPlugin({
                patterns: [
                    { from: "static", to: "static" },
                    { from: "config/catalog.schema.json" },
                    { from: "config/catalog.json", to: "catalog.json" }
                ]
            }),

            new HtmlPlugin({
                template: "app/index.ejs",
                filename: "index.html"
            }),

            new webpack.DefinePlugin({
                // This is custom inlined object to pass build version to application
                build_info: JSON.stringify({
                    version: appGitVersion
                })
            }),

            new webpack.ProvidePlugin({
                $: "jquery",
                jQuery: "jquery"
            }),

            isProduction &&
                new BundleAnalyzerPlugin({
                    // Can be `server`, `static` or `disabled`.
                    // In `server` mode analyzer will start HTTP server to show bundle report.
                    // In `static` mode single HTML file with bundle report will be generated.
                    // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
                    analyzerMode: "static",
                    // Path to bundle report file that will be generated in `static` mode.
                    // Relative to bundles output directory.
                    reportFilename: path.join(__dirname, "reports/bundle-analyzer-app-report.html"),
                    // Automatically open report in default browser
                    openAnalyzer: false,
                    // If `true`, Webpack Stats JSON file will be generated in bundles output directory
                    generateStatsFile: false,
                    // Log level. Can be 'info', 'warn', 'error' or 'silent'.
                    logLevel: "info"
                })
        ].filter(x => !!x),

        stats: { modules: false },
        performance: { hints: false },
        devServer: {
            static: {
                directory: path.join(__dirname, "dist")
            },
            port: 8091
        },
        devtool: isDevBuild ? "eval-source-map" : false
    };

    return webpackConfig;
};
