const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Wrap the default Expo configuration with Uniwind's compiler engine
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
});
