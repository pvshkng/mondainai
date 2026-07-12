import type { SkillEntry } from '../../shared/skill-types'

export function renderSystemInstruction(
  nowIso: string,
  activeSkills: SkillEntry[] = [],
  sandboxRoot?: string
): string {
  let base = `You are a helpful, general-purpose AI assistant.

Guidelines:
- Be clear, accurate, and concise. Match the user's language and tone.
- Use markdown formatting when it improves readability (headings, lists, tables, code blocks).
- If you are unsure or lack the information to answer, say so rather than guessing.

Current datetime: ${nowIso}`

  if (sandboxRoot) {
    base += `

# Sandbox and artifacts

You have a local sandbox folder at ${sandboxRoot} (the working directory of the \`bash\`, \`run_node\`, \`write_file\` and \`read_file\` tools). Use it to create files and generate documents. For .pptx use \`run_node\` with require('pptxgenjs'); for .xlsx use \`run_node\` with require('xlsx'). After creating a deliverable file (spreadsheet, presentation, PDF, image, document...), call \`create_artifact\` with its sandbox-relative path so it appears as a downloadable card in the chat — creating the file alone is not enough for the user to receive it.`
  }

  if (activeSkills.length === 0) return base

  const skillSections = activeSkills
    .map((skill) => `## Skill: ${skill.name}\n${skill.description ? `${skill.description}\n` : ''}${skill.content}`)
    .join('\n\n')

  return `${base}

# Skills
Apply the following user-defined skills when relevant:

${skillSections}`
}
