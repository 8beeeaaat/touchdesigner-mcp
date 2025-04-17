import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for clock CHOP node parameters
 */
export const clock = createCHOPSchema({
	output: z.string().optional().describe("Output"),
	hourformat: z.string().optional().describe("Hour Format"),
	houradjust: z.number().optional().describe("Hour Adjust"),
	startref: z.string().optional().describe("Start Reference"),
	msec: z.string().optional().describe("Millisecond"),
	sec: z.string().optional().describe("Second"),
	min: z.string().optional().describe("Minute"),
	hour: z.string().optional().describe("Hour"),
	ampm: z.string().optional().describe("AM/PM"),
	wday: z.string().optional().describe("Weekday"),
	day: z.string().optional().describe("Day"),
	yday: z.string().optional().describe("Year Day"),
	dayselapsed: z.string().optional().describe("Days Elapsed"),
	week: z.string().optional().describe("Week"),
	month: z.string().optional().describe("Month"),
	year: z.string().optional().describe("Year"),
	leapyear: z.string().optional().describe("Leap Year"),
	latitude1: z.number().optional().describe("Latitude 1"),
	latitude2: z.number().optional().describe("Latitude 2"),
	northsouth: z.string().optional().describe("North/South"),
	longitude1: z.number().optional().describe("Longitude 1"),
	longitude2: z.number().optional().describe("Longitude 2"),
	eastwest: z.string().optional().describe("East/West"),
	moonphase: z.string().optional().describe("Moon Phase"),
	sunphase: z.string().optional().describe("Sun Phase"),
	sunrise: z.string().optional().describe("Sunrise"),
	sunset: z.string().optional().describe("Sunset"),
	declination: z.string().optional().describe("Declination"),
});
