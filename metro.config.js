const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode/"),
};

// Drop console statements in production release bundles
if (process.env.NODE_ENV === "production") {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      compress: {
        drop_console: true,
      },
    },
  };
}

// Wrap the default Expo configuration with Uniwind's compiler engine
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
});

