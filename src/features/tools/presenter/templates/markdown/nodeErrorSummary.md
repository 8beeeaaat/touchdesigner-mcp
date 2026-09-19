## Node {{{nodePath}}}
- Operator: `{{opType}}` ({{nodeName}})
- Errors: {{errorCount}} · Warnings: {{warningCount}}

{{! Each notice closes its own blockquote, so the rendered breaks fall on the
    boundaries these notices exist to keep apart: counts with no ceiling,
    counts that disagree, and counts that are exact while an attribution is
    not. The blank line sits inside each section so it appears only with it. }}
{{#warningsUnknown}}
> ⚠️ **Warnings were not inspected.** This TouchDesigner component predates
> warning collection, so a missing file, a dangling operator reference or a
> shader that will not compile would not appear here. It also has no way to
> say when a message stream could not be read, so treat the absence of that
> notice as unknown rather than as an assurance. Update the component to see
> both.

{{/warningsUnknown}}
{{#warningCountMissing}}
> ⚠️ **The warning count was not reported.** This component says the node has
> warnings but did not say how many, so the number below is not a total.

{{/warningCountMissing}}
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
{{#unresolvedAnchors.items}}
> - `{{{path}}}` (on `{{stream}}`)
{{/unresolvedAnchors.items}}
{{#unresolvedAnchors.omitted}}
> - _… and {{unresolvedAnchors.omitted}} more._
{{/unresolvedAnchors.omitted}}

{{/unresolvedAnchors.length}}
{{#fallbackAttributions.length}}
> ℹ️ Some entries name an owner we could not resolve, so their node fell back
> to the one queried. Nothing is missing from the counts; the owner named in
> the message text is the one that failed:
{{#fallbackAttributions.items}}
> - `{{{path}}}` (on `{{stream}}`)
{{/fallbackAttributions.items}}
{{#fallbackAttributions.omitted}}
> - _… and {{fallbackAttributions.omitted}} more._
{{/fallbackAttributions.omitted}}

{{/fallbackAttributions.length}}
{{#lookupFailures.length}}
> ℹ️ Some operators could not be looked up, so their type is undetermined
> rather than absent. The entries themselves are still counted:
{{#lookupFailures.items}}
> - `{{{path}}}` (on `{{stream}}`)
{{/lookupFailures.items}}
{{#lookupFailures.omitted}}
> - _… and {{lookupFailures.omitted}} more._
{{/lookupFailures.omitted}}

{{/lookupFailures.length}}
{{#entries.length}}
| Level | Node | Type | Message |
| --- | --- | --- | --- |
{{#entries}}| {{level}} | `{{{nodePath}}}` | `{{opType}}` | {{{message}}} |
{{/entries}}
{{/entries.length}}
{{#cleanlyEmpty}}
_No errors or warnings reported._
{{/cleanlyEmpty}}

{{#truncated}}_💡 {{omittedCount}} more entries omitted._{{/truncated}}
