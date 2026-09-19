## Node {{{nodePath}}}
- Operator: `{{opType}}` ({{nodeName}})
- Errors: {{errorCount}} · Warnings: {{warningCount}}

{{! Each notice closes its own blockquote, so the rendered breaks fall on the
    boundaries these notices exist to keep apart: counts with no ceiling,
    counts that disagree, and counts that are exact while an attribution is
    not. The blank line sits inside each section so it appears only with it. }}
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
{{#fallbackAttributions.length}}
> ℹ️ Some entries name an owner we could not resolve, so their node fell back
> to the one queried. Nothing is missing from the counts; the owner named in
> the message text is the one that failed:
{{#fallbackAttributions}}
> - `{{{path}}}` (on `{{stream}}`)
{{/fallbackAttributions}}

{{/fallbackAttributions.length}}
{{#lookupFailures.length}}
> ℹ️ Some operators could not be looked up, so their type is undetermined
> rather than absent. The entries themselves are still counted:
{{#lookupFailures}}
> - `{{{path}}}` (on `{{stream}}`)
{{/lookupFailures}}

{{/lookupFailures.length}}
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
