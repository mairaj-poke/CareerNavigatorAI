export function parseSkills(value: string) {
  return value
    .split(/[,.\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CN";
}

export function createId() {
  return `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}
