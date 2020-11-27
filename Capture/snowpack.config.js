// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/#configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: "/",
    src: "/dist"
  },
  buildOptions: {
    out: "../docs"
  },
  plugins: ['@snowpack/plugin-babel', '@snowpack/plugin-dotenv'],
  installOptions: {
    treeshake: false,
    rollup: {
      dedupe: [
        "lit-html",
        "lit-element"
      ]
    }
  },
  install: [
    "lit-element",
    "lit-html"
  ]
};
