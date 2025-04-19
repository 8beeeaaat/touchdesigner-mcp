import type { z } from "zod";
import { artnet } from "./artnet.js";
import { audiodevices } from "./audiodevices.js";
import { chopexecute } from "./chopexecute.js";
import { chopto } from "./chopto.js";
import { clip } from "./clip.js";
import { convert } from "./convert.js";
import { cplusplus } from "./cplusplus.js";
import { datexecute } from "./datexecute.js";
import { error } from "./error.js";
import { etherdream } from "./etherdream.js";
import { evaluate } from "./evaluate.js";
import { examine } from "./examine.js";
import { execute } from "./execute.js";
import { fifo } from "./fifo.js";
import { filein } from "./filein.js";
import { fileout } from "./fileout.js";
import { folder } from "./folder.js";
import { inNode } from "./in.js";
import { info } from "./info.js";
import { insert } from "./insert.js";
import { json } from "./json.js";
import { keyboardin } from "./keyboardin.js";
import { lookup } from "./lookup.js";
import { mediafileinfo } from "./mediafileinfo.js";
import { merge } from "./merge.js";
import { midievent } from "./midievent.js";
import { midiin } from "./midiin.js";
import { monitors } from "./monitors.js";
import { mpcdi } from "./mpcdi.js";
import { mqttclient } from "./mqttclient.js";
import { multitouchin } from "./multitouchin.js";
import { ndi } from "./ndi.js";
import { nullNode } from "./null.js";
import { opexecute } from "./opexecute.js";
import { opfind } from "./opfind.js";
import { oscin } from "./oscin.js";
import { oscout } from "./oscout.js";
import { out } from "./out.js";
import { panelexecute } from "./panelexecute.js";
import { parameter } from "./parameter.js";
import { parameterexecute } from "./parameterexecute.js";
import { pargroupexecute } from "./pargroupexecute.js";
import { perform } from "./perform.js";
import { renderpick } from "./renderpick.js";
import { reorder } from "./reorder.js";
import { script } from "./script.js";
import { select } from "./select.js";
import { serial } from "./serial.js";
import { socketio } from "./socketio.js";
import { sopto } from "./sopto.js";
import { sort } from "./sort.js";
import { substitute } from "./substitute.js";
import { switchNode } from "./switch.js";
import { table } from "./table.js";
import { tcpip } from "./tcpip.js";
import { text } from "./text.js";
import { touchin } from "./touchin.js";
import { touchout } from "./touchout.js";
import { transpose } from "./transpose.js";
import { tuioin } from "./tuioin.js";
import { udpin } from "./udpin.js";
import { udpout } from "./udpout.js";
import { createDATSchema } from "./utils.js";
import { videodevices } from "./videodevices.js";
import { webclient } from "./webclient.js";
import { webrtc } from "./webrtc.js";
import { webserver } from "./webserver.js";
import { websocket } from "./websocket.js";
import { xml } from "./xml.js";

export const DatNodeSchemas: Record<string, z.ZodTypeAny> = {
	artnet,
	audiodevices,
	chopexecute,
	chopto,
	clip,
	convert,
	cplusplus,
	datexecute,
	error,
	etherdream,
	evaluate,
	examine,
	execute,
	fifo,
	filein,
	fileout,
	folder,
	in: inNode,
	info,
	insert,
	json,
	keyboardin,
	lookup,
	mediafileinfo,
	merge,
	midievent,
	midiin,
	monitors,
	mpcdi,
	mqttclient,
	multitouchin,
	ndi,
	null: nullNode,
	opexecute,
	opfind,
	oscin,
	oscout,
	out,
	panelexecute,
	parameter,
	parameterexecute,
	pargroupexecute,
	perform,
	renderpick,
	reorder,
	script,
	select,
	serial,
	socketio,
	sopto,
	sort,
	substitute,
	switch: switchNode,
	table,
	tcpip,
	text,
	touchin,
	touchout,
	transpose,
	tuioin,
	udpin,
	udpout,
	videodevices,
	webclient,
	webrtc,
	webserver,
	websocket,
	xml,
};

export type DatNodeSchema = z.infer<
	(typeof DatNodeSchemas)[keyof typeof DatNodeSchemas]
>;
export type DatNodeType = keyof typeof DatNodeSchemas;
export const DatNodeTypes = Object.keys(DatNodeSchemas) as DatNodeType[];

export { createDATSchema };
