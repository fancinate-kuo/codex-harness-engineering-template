import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAnalyzeArgs } from './analyze.mjs'
import {
  commandExitCode,
  runGitNexus,
  writeCommandResult
} from './command.mjs'

const action = process.argv[2] || "status";
const forwardedArgs = process.argv.slice(3)
const allowed = new Set(["status", "analyze", "setup", "list", "doctor"]);

if (!allowed.has(action)) {
  console.error(`Unsupported GitNexus action: ${action}`);
  console.error(`Allowed: ${[...allowed].join(", ")}`);
  process.exit(2);
}

const args = action === 'analyze'
  ? buildAnalyzeArgs(forwardedArgs)
  : [action, ...forwardedArgs]
const result = runGitNexus(args)
writeCommandResult(result)

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  process.exit(commandExitCode(result))
}
