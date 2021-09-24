const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  const input1 = core.getInput("INPUT-1");
  const input2 = core.getInput("INPUT-2");
}

run();
