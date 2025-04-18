import type { z } from "zod";
import { abletonlink } from "./abletonlink.js";
import { analyze } from "./analyze.js";
import { angle } from "./angle.js";
import { attribute } from "./attribute.js";
import { audiobandeq } from "./audiobandeq.js";
import { audiobinaural } from "./audiobinaural.js";
import { audiodevicein } from "./audiodevicein.js";
import { audiodeviceout } from "./audiodeviceout.js";
import { audiodynamics } from "./audiodynamics.js";
import { audiofilein } from "./audiofilein.js";
import { audiofileout } from "./audiofileout.js";
import { audiofilter } from "./audiofilter.js";
import { audiomovie } from "./audiomovie.js";
import { audiondi } from "./audiondi.js";
import { audiooscillator } from "./audiooscillator.js";
import { audioparaeq } from "./audioparaeq.js";
import { audioplay } from "./audioplay.js";
import { audiorender } from "./audiorender.js";
import { audiospectrum } from "./audiospectrum.js";
import { audiostreamin } from "./audiostreamin.js";
import { audiostreamout } from "./audiostreamout.js";
import { audiovst } from "./audiovst.js";
import { audiowebrender } from "./audiowebrender.js";
import { beat } from "./beat.js";
import { bind } from "./bind.js";
import { blacktrax } from "./blacktrax.js";
import { blend } from "./blend.js";
import { blobtrack } from "./blobtrack.js";
import { bodytrack } from "./bodytrack.js";
import { bulletsolver } from "./bulletsolver.js";
import { clip } from "./clip.js";
import { clipblender } from "./clipblender.js";
import { clock } from "./clock.js";
import { composite } from "./composite.js";
import { constant } from "./constant.js";
import { copy } from "./copy.js";
import { count } from "./count.js";
import { cplusplus } from "./cplusplus.js";
import { cross } from "./cross.js";
import { cycle } from "./cycle.js";
import { datto } from "./datto.js";
import { delay } from "./delay.js";
import { deleteNode } from "./delete.js";
import { dmxin } from "./dmxin.js";
import { dmxout } from "./dmxout.js";
import { envelope } from "./envelope.js";
import { event } from "./event.js";
import { expression } from "./expression.js";
import { extend } from "./extend.js";
import { facetrack } from "./facetrack.js";
import { fan } from "./fan.js";
import { feedback } from "./feedback.js";
import { filein } from "./filein.js";
import { fileout } from "./fileout.js";
import { filter } from "./filter.js";
import { freedin } from "./freedin.js";
import { freedout } from "./freedout.js";
import { functionNode } from "./function.js";
import { gesture } from "./gesture.js";
import { handle } from "./handle.js";
import { hog } from "./hog.js";
import { hokuyo } from "./hokuyo.js";
import { hold } from "./hold.js";
import { importselect } from "./importselect.js";
import { inNode } from "./in.js";
import { info } from "./info.js";
import { interpolate } from "./interpolate.js";
import { inversecurve } from "./inversecurve.js";
import { inversekin } from "./inversekin.js";
import { join } from "./join.js";
import { joystick } from "./joystick.js";
import { keyboardin } from "./keyboardin.js";
import { keyframe } from "./keyframe.js";
import { kinect } from "./kinect.js";
import { kinectazure } from "./kinectazure.js";
import { lag } from "./lag.js";
import { laser } from "./laser.js";
import { laserdevice } from "./laserdevice.js";
import { leapmotion } from "./leapmotion.js";
import { leuzerod4 } from "./leuzerod4.js";
import { lfo } from "./lfo.js";
import { limit } from "./limit.js";
import { logic } from "./logic.js";
import { lookup } from "./lookup.js";
import { ltcin } from "./ltcin.js";
import { ltcout } from "./ltcout.js";
import { math } from "./math.js";
import { merge } from "./merge.js";
import { midiin } from "./midiin.js";
import { midiinmap } from "./midiinmap.js";
import { midiout } from "./midiout.js";
import { mosys } from "./mosys.js";
import { mousein } from "./mousein.js";
import { mouseout } from "./mouseout.js";
import { ncam } from "./ncam.js";
import { noise } from "./noise.js";
import { nullNode } from "./null.js";
import { oakdevice } from "./oakdevice.js";
import { oakselect } from "./oakselect.js";
import { object } from "./object.js";
import { oculusaudio } from "./oculusaudio.js";
import { oculusrift } from "./oculusrift.js";
import { openvr } from "./openvr.js";
import { optitrackin } from "./optitrackin.js";
import { oscin } from "./oscin.js";
import { oscout } from "./oscout.js";
import { outNode } from "./out.js";
import { override } from "./override.js";
import { panel } from "./panel.js";
import { pangolin } from "./pangolin.js";
import { parameter } from "./parameter.js";
import { pattern } from "./pattern.js";
import { perform } from "./perform.js";
import { phaser } from "./phaser.js";
import { pipein } from "./pipein.js";
import { pipeout } from "./pipeout.js";
import { posistagenet } from "./posistagenet.js";
import { pulse } from "./pulse.js";
import { record } from "./record.js";
import { rename } from "./rename.js";
import { renderpick } from "./renderpick.js";
import { renderstreamin } from "./renderstreamin.js";
import { reorder } from "./reorder.js";
import { replace } from "./replace.js";
import { resample } from "./resample.js";
import { script } from "./script.js";
import { scurve } from "./scurve.js";
import { select } from "./select.js";
import { sequencer } from "./sequencer.js";
import { serial } from "./serial.js";
import { sharedmemin } from "./sharedmemin.js";
import { sharedmemout } from "./sharedmemout.js";
import { shift } from "./shift.js";
import { shuffle } from "./shuffle.js";
import { slope } from "./slope.js";
import { sopto } from "./sopto.js";
import { sort } from "./sort.js";
import { speed } from "./speed.js";
import { splice } from "./splice.js";
import { spring } from "./spring.js";
import { stretch } from "./stretch.js";
import { stypein } from "./stypein.js";
import { stypeout } from "./stypeout.js";
import { switchNode } from "./switch.js";
import { syncin } from "./syncin.js";
import { syncout } from "./syncout.js";
import { tablet } from "./tablet.js";
import { timecode } from "./timecode.js";
import { timeline } from "./timeline.js";
import { timer } from "./timer.js";
import { timeslice } from "./timeslice.js";
import { topto } from "./topto.js";
import { touchin } from "./touchin.js";
import { touchout } from "./touchout.js";
import { trail } from "./trail.js";
import { transform } from "./transform.js";
import { transformxyz } from "./transformxyz.js";
import { trigger } from "./trigger.js";
import { trim } from "./trim.js";
import { createCHOPSchema } from "./utils.js";
import { warp } from "./warp.js";
import { wave } from "./wave.js";
import { zed } from "./zed.js";

/**
 * Schemas for TouchDesigner CHOP node parameters
 * Using internal TouchDesigner node type names (lowercase) for consistency
 */
export const ChopNodeSchemas = {
abletonlink,
analyze,
angle,
attribute,
audiobandeq,
audiobinaural,
audiodevicein,
audiodeviceout,
audiodynamics,
audiofilein,
audiofileout,
audiofilter,
audiomovie,
audiondi,
audiooscillator,
audioparaeq,
audioplay,
audiorender,
audiospectrum,
audiostreamin,
audiostreamout,
audiovst,
audiowebrender,
beat,
bind,
blacktrax,
blend,
blobtrack,
bodytrack,
bulletsolver,
clip,
clipblender,
clock,
composite,
constant,
copy,
count,
cplusplus,
cross,
cycle,
datto,
delay,
delete: deleteNode,
dmxin,
dmxout,
envelope,
event,
expression,
extend,
facetrack,
fan,
feedback,
filein,
fileout,
filter,
freedin,
freedout,
function: functionNode,
gesture,
handle,
hog,
hokuyo,
hold,
importselect,
in: inNode,
info,
interpolate,
inversecurve,
inversekin,
join,
joystick,
keyboardin,
keyframe,
kinect,
kinectazure,
lag,
laser,
laserdevice,
leapmotion,
leuzerod4,
lfo,
limit,
logic,
lookup,
ltcin,
ltcout,
math,
merge,
midiin,
midiinmap,
midiout,
mosys,
mousein,
mouseout,
ncam,
noise,
null: nullNode,
oakdevice,
oakselect,
object,
oculusaudio,
oculusrift,
openvr,
optitrackin,
oscin,
oscout,
out: outNode,
override,
panel,
pangolin,
parameter,
pattern,
perform,
phaser,
pipein,
pipeout,
posistagenet,
pulse,
record,
rename,
renderpick,
renderstreamin,
reorder,
replace,
resample,
script,
scurve,
select,
sequencer,
serial,
sharedmemin,
sharedmemout,
shift,
shuffle,
slope,
sopto,
sort,
speed,
splice,
spring,
stretch,
stypein,
stypeout,
switch: switchNode,
syncin,
syncout,
tablet,
timecode,
timeline,
timer,
timeslice,
topto,
touchin,
touchout,
trail,
transform,
transformxyz,
trigger,
trim,
warp,
wave,
zed,
};

export type ChopNodeSchema = z.infer<
	(typeof ChopNodeSchemas)[keyof typeof ChopNodeSchemas]
>;
export type ChopNodeType = keyof typeof ChopNodeSchemas;
export const ChopNodeTypes = Object.keys(ChopNodeSchemas) as ChopNodeType[];

export { createCHOPSchema };
