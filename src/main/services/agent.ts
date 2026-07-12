import Anthropic from '@anthropic-ai/sdk'
import type {
  ChatAnswersPayload,
  ChatAttachment,
  ChatEvent,
  ChatQuestion,
  ChatSendPayload,
  SkillMeta
} from '../../shared/types'
import { contextWindowForModel } from '../../shared/types'
import { appendConversation, readCoreMemory, runMemoryCommand, type MemoryCommandInput } from './memory'
import { discoverSkills, readSkill, stripFrontmatter } from './skills'
import {
  ensureSandbox,
  execBash,
  readSandboxFile,
  runNodeScript,
  writeSandboxFile
} from './sandbox'
import { getSettings } from './settings'

const MAX_LOOP_ITERATIONS = 24
const MAX_OUTPUT_TOKENS = 32000
// Compact once the conversation fills this share of the usable window
// (context window minus the output-token reservation).
const COMPACTION_RATIO = 0.85
const COMPACTION_MAX_TOKENS = 8000

// Models that support adaptive thinking (Haiku 4.5 does not).
const ADAPTIVE_THINKING_MODELS = new Set(['claude-opus-4-8', 'claude-sonnet-5'])

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'memory',
    description: `Read and maintain long-term memory. Files: core.md (short, durable user facts — injected into every conversation), notes.md (detailed timestamped notes), conversations.jsonl (past conversation history, searchable).

Rules:
- If the user's request might depend on preferences, history, constraints, or goals, search first, then reply.
- Store durable user facts in core.md (keep it short) and detailed notes in notes.md (prefer mode=append).
- Keep memory operations invisible in user-facing replies.`,
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['view', 'create', 'update', 'search'],
          description: 'view to read a file, create/update to write, search to find matching lines.'
        },
        path: {
          type: 'string',
          description: 'Memory file: core.md, notes.md or conversations.jsonl. Required for view/create/update; optional scope for search.'
        },
        content: { type: 'string', description: 'Text to write for create or update.' },
        mode: {
          type: 'string',
          enum: ['append', 'overwrite'],
          description: 'Write mode for update. Defaults to overwrite.'
        },
        query: { type: 'string', description: 'Search keywords (1-4 short terms).' }
      },
      required: ['command'],
      additionalProperties: false
    }
  },
  {
    name: 'load_skill',
    description:
      'Load a skill to get its full specialized instructions. Call this BEFORE performing a task that matches an available skill description. Returns the skill instructions and the skill directory path (use read_file with skill:<name>/<relative path> for bundled resources).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill name to load, exactly as listed.' }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  {
    name: 'bash',
    description:
      'Execute a bash/shell command inside the local sandbox folder (the working directory). Use it to create files, inspect them, run git (init/add/commit), unzip, etc. Destructive system commands are blocked. Output is truncated at 32k characters.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute.' },
        timeout_seconds: { type: 'number', description: 'Timeout in seconds (default 60, max 300).' }
      },
      required: ['command'],
      additionalProperties: false
    }
  },
  {
    name: 'run_node',
    description: `Run a JavaScript (CommonJS) snippet with Node.js, cwd set to the sandbox folder. The modules 'pptxgenjs' (PowerPoint) and 'xlsx' (Excel) are available via require(). Use this to generate .pptx and .xlsx files in the sandbox. Print progress with console.log; write output files with relative paths.`,
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'CommonJS JavaScript source to execute.' },
        timeout_seconds: { type: 'number', description: 'Timeout in seconds (default 120, max 300).' }
      },
      required: ['code'],
      additionalProperties: false
    }
  },
  {
    name: 'write_file',
    description:
      'Write a file inside the sandbox folder. Prefer this over bash heredocs for file content. Paths are relative to the sandbox root; parent directories are created automatically.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Sandbox-relative file path.' },
        content: { type: 'string', description: 'File content (text, or base64 when encoding=base64).' },
        encoding: { type: 'string', enum: ['utf8', 'base64'], description: 'Defaults to utf8.' }
      },
      required: ['path', 'content'],
      additionalProperties: false
    }
  },
  {
    name: 'read_file',
    description:
      'Read a text file. Paths are sandbox-relative by default. To read a file bundled with a skill, prefix with "skill:<skill name>/" e.g. skill:pdf-tools/references/api.md.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read.' }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    name: 'ask_user_questions',
    description: `Ask the user one or more clarifying questions when the request is ambiguous or a decision is genuinely theirs to make. The conversation pauses until they answer. Each question is shown with its options as selectable choices plus a free-form text field for a custom answer, so you do not need an "Other" option. Ask only when the answer changes what you would do next — prefer sensible defaults over asking about trivia.`,
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          description: 'One to four independent questions.',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The complete question to ask, ending with a question mark.'
              },
              header: {
                type: 'string',
                description: 'Very short topic label (1-2 words), e.g. "Approach" or "Library".'
              },
              multi_select: {
                type: 'boolean',
                description: 'Allow selecting several options. Defaults to false.'
              },
              options: {
                type: 'array',
                minItems: 2,
                maxItems: 6,
                description: 'Distinct answer choices for the user to pick from.',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', description: 'Concise choice text (1-5 words).' },
                    description: {
                      type: 'string',
                      description: 'Optional explanation of what this choice means.'
                    }
                  },
                  required: ['label'],
                  additionalProperties: false
                }
              }
            },
            required: ['question', 'options'],
            additionalProperties: false
          }
        }
      },
      required: ['questions'],
      additionalProperties: false
    }
  }
]

function parseQuestions(input: unknown): ChatQuestion[] {
  const args = (input ?? {}) as { questions?: unknown }
  if (!Array.isArray(args.questions)) return []
  return args.questions
    .map((raw) => {
      const q = (raw ?? {}) as Record<string, unknown>
      const options = Array.isArray(q.options)
        ? q.options
            .map((o) => {
              const opt = (o ?? {}) as Record<string, unknown>
              return {
                label: String(opt.label ?? '').trim(),
                description: opt.description ? String(opt.description) : undefined
              }
            })
            .filter((o) => o.label)
        : []
      return {
        question: String(q.question ?? '').trim(),
        header: q.header ? String(q.header) : undefined,
        multiSelect: Boolean(q.multi_select),
        options
      }
    })
    .filter((q) => q.question && q.options.length > 0)
}

function buildSkillsPrompt(skills: SkillMeta[]): string {
  if (skills.length === 0) {
    return '## Skills\n\nNo skills are currently available for this conversation.'
  }
  const list = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n')
  return `## Skills

Use the \`load_skill\` tool to load a skill when the user's request would benefit from its specialized instructions. Load the skill BEFORE starting the task.

Available skills:
${list}`
}

async function buildSystemPrompt(activeSkills: SkillMeta[], sandboxRoot: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const coreMemory = await readCoreMemory()

  return `You are Mondainai, a helpful desktop AI assistant with persistent memory, loadable skills, and a local sandbox for running code and creating files.

Today's date is ${today}.

## Core memory

${coreMemory.trim() || '(empty)'}

## Memory

You can save and recall information with the \`memory\` tool. Search memory (notes and past conversations) before answering questions that may depend on prior context. Save durable user facts to core.md and detailed notes to notes.md. Do not narrate memory operations to the user.

${buildSkillsPrompt(activeSkills)}

## Sandbox

You have a local sandbox folder at ${sandboxRoot} (the working directory of the \`bash\`, \`run_node\`, \`write_file\` and \`read_file\` tools). Use it to create files, initialize git repositories and commit code, and generate documents. For .pptx use run_node with require('pptxgenjs'); for .xlsx use run_node with require('xlsx'). Tell the user the file names you created; they can browse the sandbox from the app's Sandbox screen.`
}

function userContent(text: string, attachments: ChatAttachment[]): Anthropic.MessageParam['content'] {
  if (attachments.length === 0) return text
  const blocks: Anthropic.ContentBlockParam[] = []
  for (const att of attachments) {
    if (att.mediaType.startsWith('image/')) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: att.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: att.dataBase64
        }
      })
    } else if (att.mediaType === 'application/pdf') {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: att.dataBase64 }
      })
    }
  }
  blocks.push({ type: 'text', text })
  return blocks
}

async function executeTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  try {
    const args = (input ?? {}) as Record<string, unknown>
    switch (name) {
      case 'memory': {
        const output = await runMemoryCommand(args as unknown as MemoryCommandInput)
        return { content: output, isError: false }
      }
      case 'load_skill': {
        const { meta, content } = await readSkill(String(args.name ?? ''))
        return {
          content: `Skill directory: ${meta.path}\nBundled files: ${meta.files.join(', ') || '(none)'}\n\n${stripFrontmatter(content)}`,
          isError: false
        }
      }
      case 'bash': {
        const result = await execBash(String(args.command ?? ''), Number(args.timeout_seconds) || 60)
        return {
          content: `exit code: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
          isError: result.exitCode !== 0
        }
      }
      case 'run_node': {
        const result = await runNodeScript(String(args.code ?? ''), Number(args.timeout_seconds) || 120)
        return {
          content: `exit code: ${result.exitCode}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
          isError: result.exitCode !== 0
        }
      }
      case 'write_file': {
        const target = await writeSandboxFile(
          String(args.path ?? ''),
          String(args.content ?? ''),
          args.encoding === 'base64' ? 'base64' : 'utf8'
        )
        return { content: `Wrote ${target}`, isError: false }
      }
      case 'read_file': {
        const path = String(args.path ?? '')
        if (path.startsWith('skill:')) {
          const rest = path.slice('skill:'.length)
          const slash = rest.indexOf('/')
          if (slash === -1) throw new Error('Use skill:<name>/<relative path>')
          const { meta } = await readSkill(rest.slice(0, slash))
          const rel = rest.slice(slash + 1)
          if (rel.includes('..')) throw new Error('Path traversal is not allowed')
          const { readFile } = await import('node:fs/promises')
          const { join } = await import('node:path')
          return { content: await readFile(join(meta.path, rel), 'utf8'), isError: false }
        }
        return { content: await readSandboxFile(path), isError: false }
      }
      default:
        return { content: `Unknown tool: ${name}`, isError: true }
    }
  } catch (err) {
    return { content: `Tool failed: ${(err as Error).message}`, isError: true }
  }
}

// ---------------------------------------------------------------------------

interface ChatSession {
  history: Anthropic.MessageParam[]
  abortController: AbortController | null
  // Total tokens the conversation currently occupies in the model's context
  // window. Updated from usage on every response; an estimate until then.
  contextTokens: number
  // Set while the loop is blocked on an ask_user_questions tool call.
  // Resolving with null means the questions were dismissed (stop/reset).
  pendingQuestions: { toolUseId: string; resolve: (answers: string[][] | null) => void } | null
}

const sessions = new Map<string, ChatSession>()

function getSession(chatId: string): ChatSession {
  let session = sessions.get(chatId)
  if (!session) {
    session = { history: [], abortController: null, contextTokens: 0, pendingQuestions: null }
    sessions.set(chatId, session)
  }
  return session
}

export function resetChat(chatId: string): void {
  const session = sessions.get(chatId)
  if (!session) return
  session.pendingQuestions?.resolve(null)
  session.pendingQuestions = null
  session.abortController?.abort()
  sessions.delete(chatId)
}

export function answerQuestions(chatId: string, payload: ChatAnswersPayload): void {
  const session = sessions.get(chatId)
  if (!session?.pendingQuestions || session.pendingQuestions.toolUseId !== payload.toolUseId) return
  const { resolve } = session.pendingQuestions
  session.pendingQuestions = null
  resolve(payload.answers)
}

/** Context occupied after a response = full prompt (cached or not) + output. */
function usageContextTokens(usage: Anthropic.Usage): number {
  return (
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    usage.output_tokens
  )
}

const COMPACTOR_SYSTEM = `You are a conversation compactor. The conversation you receive is about to exceed the model's context window and will be replaced by your summary.

Write a detailed continuation briefing that lets the assistant resume seamlessly. Include:
- The user's goals, requests and preferences stated so far
- Key facts, decisions and constraints
- The current task: what has been done, what remains, and the immediate next step
- Important tool activity: files created or modified (with paths), command results, skills loaded, memory entries written
- Anything the user asked to remember or that would be costly to rediscover

Write it as a briefing for the assistant. Do not address the user and do not omit in-progress work.`

/**
 * Automatic context compaction: summarize the whole conversation with the
 * model and replace the history with that summary so the loop can continue.
 */
async function compactContext(
  session: ChatSession,
  client: Anthropic,
  model: string,
  emit: (ev: ChatEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const tokensBefore = session.contextTokens
  emit({ type: 'compaction', phase: 'start' })

  const response = await client.messages.create(
    {
      model,
      max_tokens: COMPACTION_MAX_TOKENS,
      system: COMPACTOR_SYSTEM,
      messages: [
        ...session.history,
        {
          role: 'user',
          content:
            'Compact the conversation above into a continuation briefing now. Reply with the briefing only.'
        }
      ]
    },
    { signal }
  )

  const summary = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!summary) throw new Error('Context compaction produced an empty summary')

  session.history = [
    {
      role: 'user',
      content: `<conversation_summary>
This conversation was automatically compacted to fit the model's context window. Everything before this message was replaced by the following summary:

${summary}
</conversation_summary>

Continue the conversation from where the summary leaves off.`
    }
  ]
  // The next response's usage gives the exact figure; approximate until then.
  session.contextTokens = response.usage.output_tokens + 500
  emit({ type: 'compaction', phase: 'done', tokensBefore, tokensAfter: session.contextTokens })
  emit({
    type: 'context',
    tokens: session.contextTokens,
    contextWindow: contextWindowForModel(model)
  })
}

export function stopChat(chatId: string): void {
  const session = sessions.get(chatId)
  if (!session) return
  // Dismiss any pending questions first so the loop wakes up and then sees
  // the aborted signal.
  session.pendingQuestions?.resolve(null)
  session.pendingQuestions = null
  session.abortController?.abort()
}

export async function sendChat(
  chatId: string,
  payload: ChatSendPayload,
  emit: (ev: ChatEvent) => void
): Promise<void> {
  const session = getSession(chatId)
  if (session.abortController) {
    emit({ type: 'error', message: 'This chat is still working on the previous message.' })
    return
  }

  const settings = await getSettings()
  if (!settings.apiKey) {
    emit({ type: 'error', message: 'No API key configured. Add your Anthropic API key in Settings.' })
    return
  }

  const client = new Anthropic({ apiKey: settings.apiKey })
  const sandboxRoot = await ensureSandbox()

  const allSkills = await discoverSkills()
  const activeSkills = allSkills.filter(
    (s) => s.enabled && payload.activeSkills.includes(s.name)
  )
  const system = await buildSystemPrompt(activeSkills, sandboxRoot)

  session.abortController = new AbortController()
  const signal = session.abortController.signal

  const contextWindow = contextWindowForModel(settings.model)
  const compactionThreshold = Math.floor((contextWindow - MAX_OUTPUT_TOKENS) * COMPACTION_RATIO)

  let checkpoint = session.history.length
  session.history.push({ role: 'user', content: userContent(payload.text, payload.attachments) })
  await appendConversation({
    role: 'user',
    content: payload.text,
    timestamp: new Date().toISOString()
  })

  emit({ type: 'start' })
  let fullText = ''

  try {
    for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
      // Automatic context compaction: keep the conversation inside the
      // model's context window before sending the next request.
      if (session.contextTokens > compactionThreshold) {
        await compactContext(session, client, settings.model, emit, signal)
        // History was replaced wholesale; the old rollback point is gone.
        checkpoint = session.history.length
      }

      const params: Anthropic.MessageStreamParams = {
        model: settings.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        tools: TOOLS,
        messages: session.history
      }
      if (ADAPTIVE_THINKING_MODELS.has(settings.model)) {
        params.thinking = { type: 'adaptive' }
      }

      const stream = client.messages.stream(params, { signal })
      stream.on('text', (delta) => {
        fullText += delta
        emit({ type: 'text', delta })
      })
      stream.on('contentBlock', (block) => {
        if (block.type === 'thinking') emit({ type: 'thinking' })
      })

      const message = await stream.finalMessage()
      session.history.push({ role: 'assistant', content: message.content })

      session.contextTokens = usageContextTokens(message.usage)
      emit({ type: 'context', tokens: session.contextTokens, contextWindow })

      // The model hit the context window mid-turn: compact and retry.
      if ((message.stop_reason as string) === 'model_context_window_exceeded') {
        await compactContext(session, client, settings.model, emit, signal)
        checkpoint = session.history.length
        continue
      }

      if (message.stop_reason === 'pause_turn') continue

      if (message.stop_reason === 'refusal') {
        emit({ type: 'error', message: 'The model declined to answer this request.' })
        break
      }

      const toolUses = message.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const tool of toolUses) {
        if (signal.aborted) break

        if (tool.name === 'ask_user_questions') {
          const questions = parseQuestions(tool.input)
          if (questions.length === 0) {
            results.push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: 'Invalid input: provide at least one question with at least two options.',
              is_error: true
            })
            continue
          }
          // Pause the loop until the user submits answers (or stops the chat).
          emit({ type: 'questions', toolUseId: tool.id, questions })
          const answers = await new Promise<string[][] | null>((resolve) => {
            session.pendingQuestions = { toolUseId: tool.id, resolve }
          })
          session.pendingQuestions = null
          if (answers === null) {
            // Dismissed via stop/reset; the aborted signal is checked below.
            results.push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: 'The user dismissed the questions without answering.',
              is_error: false
            })
            continue
          }
          const content = questions
            .map((q, i) => {
              const given = (answers[i] ?? []).filter((a) => a.trim())
              return `Q: ${q.question}\nA: ${given.length > 0 ? given.join('; ') : '(no answer)'}`
            })
            .join('\n\n')
          results.push({ type: 'tool_result', tool_use_id: tool.id, content, is_error: false })
          continue
        }

        emit({ type: 'tool_start', id: tool.id, name: tool.name, input: tool.input })
        const { content, isError } = await executeTool(tool.name, tool.input)
        emit({
          type: 'tool_result',
          id: tool.id,
          name: tool.name,
          ok: !isError,
          summary: content.length > 400 ? `${content.slice(0, 400)}…` : content
        })
        results.push({ type: 'tool_result', tool_use_id: tool.id, content, is_error: isError })
      }
      if (signal.aborted) {
        session.history.length = checkpoint
        break
      }
      session.history.push({ role: 'user', content: results })
    }

    if (fullText) {
      await appendConversation({
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString()
      })
    }
    emit({ type: 'done', text: fullText })
  } catch (err) {
    // Roll the exchange back so the next request has valid turn alternation.
    session.history.length = checkpoint
    if (signal.aborted) {
      emit({ type: 'done', text: fullText })
      return
    }
    emit({ type: 'error', message: (err as Error).message })
  } finally {
    session.abortController = null
    session.pendingQuestions = null
  }
}
