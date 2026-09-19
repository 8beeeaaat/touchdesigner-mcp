## Node {{{nodePath}}}
- Operator: `{{opType}}` ({{nodeName}})
- Errors: {{errorCount}} · Warnings: {{warningCount}}

{{#incomplete}}
> ⚠️ **Incomplete.** A message stream could not be read, so the counts above
> have no ceiling. Do not read this as a clean node.
{{#skippedStreams}}
> - stream `{{stream}}` — {{reason}}
{{/skippedStreams}}
{{/incomplete}}
{{#countsDisagree}}
> ⚠️ The reported counts do not match the {{listedCount}} entr(ies) returned.
{{/countsDisagree}}
{{#unresolvedAnchors.length}}
> ℹ️ Some attributions are ambiguous. These paths began a message but name no
> operator we can see, so their lines stayed with the entry above them and a
> failure may be folded into another operator's message:
{{#unresolvedAnchors}}
> - `{{{path}}}` (on `{{stream}}`)
{{/unresolvedAnchors}}
{{/unresolvedAnchors.length}}

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
