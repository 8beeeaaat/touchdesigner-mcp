## Node {{{nodePath}}}
- Operator: `{{opType}}` ({{nodeName}})
- Errors: {{errorCount}} · Warnings: {{warningCount}}

{{#incomplete}}
> ⚠️ **Incomplete.** A message stream could not be read, so the counts above
> are a floor, not a total. Do not read this as a clean node.
{{#skippedStreams}}
> - stream `{{stream}}` — {{reason}}
{{/skippedStreams}}
{{#unresolvedAnchors}}
> - `{{{path}}}` started a message but could not be resolved; its lines were
>   kept with the entry above it, so a failure there may not be counted
>   separately.
{{/unresolvedAnchors}}
{{/incomplete}}
{{#countsDisagree}}
> ⚠️ The reported counts do not match the {{listedCount}} entr(ies) returned.
{{/countsDisagree}}

{{#entries.length}}
| Level | Node | Type | Message |
| --- | --- | --- | --- |
{{#entries}}| {{level}} | `{{{nodePath}}}` | `{{opType}}` | {{{message}}} |
{{/entries}}
{{/entries.length}}
{{^entries.length}}
_No errors or warnings reported._
{{/entries.length}}

{{#truncated}}_💡 {{omittedCount}} more entries omitted._{{/truncated}}
