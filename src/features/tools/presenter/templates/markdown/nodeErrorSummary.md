## Node {{{nodePath}}}
- Operator: `{{opType}}` ({{nodeName}})
- Errors: {{errorCount}} · Warnings: {{warningCount}}

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
