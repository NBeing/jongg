const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const path = require('path');

module.exports = [{
  mode: 'development',
  devtool: 'source-map',
  entry: {
    main: path.resolve(__dirname, '/src/index.js')
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].bundle.js'
  },
  watchOptions: {
    poll: 1000 // hack for wsl
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: false,
    port: 3000,
  },
  module: {
    rules: [
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        exclude: /node_modules/,
        use: ['raw-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(ogg|mp3|wav|mpe?g)$/i,
        use: 'file-loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'WebGL Project Boilerplate',
      template: path.resolve(__dirname, 'webgl.html'),
      inject: 'body'
    }),
    new MiniCssExtractPlugin(),
  ],
},
// {
//   target: 'node',
//   entry: './src/serial_backend/index.js',
//   mode: 'development',
//   output: {
//     path: path.resolve(__dirname, 'dist/server'),
//     filename: 'server.js'
//   }
// }
];
