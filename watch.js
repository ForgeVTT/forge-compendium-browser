const { spawn } = require("node:child_process");
const { version } = require("./module.json");

const path = process.argv[2];
const dest = path ? `${path}/${version}/dist` : "./dist";

spawn(
    "npx",
    [
        "concurrently",
        "--kill-others-on-fail",
        `npm run watch-vue -- --dest ${dest}`,
        `npm run watch-js -- --dest ${dest}`,
    ],
    { stdio: "inherit" }
);