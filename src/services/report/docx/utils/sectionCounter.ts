/**
 * Auto-numbering for H1 sections (§1, §2, etc.)
 */
let counter = 0;

export function resetSectionCounter(): void {
  counter = 0;
}

export function nextSectionNumber(): number {
  counter++;
  return counter;
}

export function sectionPrefix(): string {
  return `§${counter} `;
}
