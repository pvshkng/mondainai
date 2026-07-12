import type { SkillEntry } from '../../shared/skill-types'

export function renderSystemInstruction(nowIso: string, activeSkills: SkillEntry[] = []): string {
  const base = `You are a helpful, general-purpose AI assistant.

Guidelines:
- Be clear, accurate, and concise. Match the user's language and tone.
- Use markdown formatting when it improves readability (headings, lists, tables, code blocks).
- If you are unsure or lack the information to answer, say so rather than guessing.

Current datetime: ${nowIso}`

  if (activeSkills.length === 0) return base

  const skillSections = activeSkills
    .map((skill) => `## Skill: ${skill.name}\n${skill.description ? `${skill.description}\n` : ''}${skill.content}`)
    .join('\n\n')

  return `${base}

# Skills
Apply the following user-defined skills when relevant:

${skillSections}`
}
