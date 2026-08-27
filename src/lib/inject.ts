export function hookContext(event: 'SessionStart' | 'UserPromptSubmit', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })
}
