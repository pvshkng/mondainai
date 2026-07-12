import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SaveSkillInput, SkillEntry } from '../../shared/skill-types'

let filePath = ''
let skills: SkillEntry[] | null = null

function getFilePath(): string {
  if (!filePath) {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    filePath = join(dir, 'skills.json')
  }
  return filePath
}

function load(): SkillEntry[] {
  if (skills) return skills
  const path = getFilePath()
  if (existsSync(path)) {
    try {
      skills = JSON.parse(readFileSync(path, 'utf8')) as SkillEntry[]
    } catch {
      skills = []
    }
  } else {
    skills = []
  }
  return skills
}

function persist(): void {
  writeFileSync(getFilePath(), JSON.stringify(skills ?? [], null, 2))
}

export function listSkills(): SkillEntry[] {
  return load()
}

export function getActiveSkills(): SkillEntry[] {
  return load().filter((s) => s.active)
}

export function saveSkill(id: string | null, input: SaveSkillInput): SkillEntry[] {
  const all = load()
  if (id) {
    const existing = all.find((s) => s.id === id)
    if (existing) Object.assign(existing, input)
  } else {
    all.push({ id: randomUUID(), ...input })
  }
  persist()
  return all
}

export function deleteSkill(id: string): SkillEntry[] {
  skills = load().filter((s) => s.id !== id)
  persist()
  return skills
}
