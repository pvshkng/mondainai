import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import {
  execBash,
  readSandboxFile,
  runNodeScript,
  statSandboxArtifact,
  writeSandboxFile
} from '../services/sandbox'

export function getSandboxTools(): ToolSet {
  return {
    write_file: tool({
      description:
        'Write a file inside the local sandbox folder. Prefer this over shell heredocs for file content. Paths are relative to the sandbox root; parent directories are created automatically.',
      inputSchema: z.object({
        path: z.string().describe('Sandbox-relative file path.'),
        content: z.string().describe('File content (text, or base64 when encoding is base64).'),
        encoding: z.enum(['utf8', 'base64']).default('utf8')
      }),
      execute: async ({ path, content, encoding }) => {
        const target = await writeSandboxFile(path, content, encoding)
        return `Wrote ${target}`
      }
    }),
    read_file: tool({
      description: 'Read a text file from the local sandbox folder.',
      inputSchema: z.object({ path: z.string().describe('Sandbox-relative file path.') }),
      execute: async ({ path }) => readSandboxFile(path)
    }),
    run_node: tool({
      description:
        'Run a CommonJS JavaScript snippet with Node.js, working directory set to the sandbox folder. The modules "pptxgenjs" (PowerPoint) and "xlsx" (Excel) are available via require(). Use this to generate .pptx and .xlsx files. pptxgenjs: slide.addText(text, options) takes a string or array of {text, options} runs first, then a position/style object — never a bare object. Print progress with console.log; write output files with relative paths. If the script fails, fix the code and run it again rather than giving up.',
      inputSchema: z.object({
        code: z.string().describe('CommonJS JavaScript source to execute.'),
        timeout_seconds: z.number().default(120).describe('Timeout in seconds (max 300).')
      }),
      execute: async ({ code, timeout_seconds }) => {
        const result = await runNodeScript(code, timeout_seconds)
        return `exit code: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      }
    }),
    bash: tool({
      description:
        'Execute a bash/shell command inside the local sandbox folder. Use it to unzip archives, run git, or inspect files. Destructive system commands are blocked. Output is truncated at 32k characters.',
      inputSchema: z.object({
        command: z.string().describe('The shell command to execute.'),
        timeout_seconds: z.number().default(60).describe('Timeout in seconds (max 300).')
      }),
      execute: async ({ command, timeout_seconds }) => {
        const result = await execBash(command, timeout_seconds)
        return `exit code: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      }
    }),
    create_artifact: tool({
      description:
        'Share a file from the sandbox with the user as a downloadable artifact card in the chat. Call this after creating any deliverable file (.xlsx, .pptx, .pdf, .csv, images, documents, ...) — creating the file alone is not enough for the user to receive it. The file must already exist in the sandbox.',
      inputSchema: z.object({ path: z.string().describe('Sandbox-relative path of the file to share.') }),
      execute: async ({ path }) => statSandboxArtifact(path)
    })
  }
}
