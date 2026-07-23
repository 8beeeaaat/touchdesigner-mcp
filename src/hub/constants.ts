/** Default tdmcp-hub bind — see docs/hub.md */
export const HUB_DEFAULT_HOST = "127.0.0.1";
export const HUB_DEFAULT_PORT = 9980;
export const HUB_APP_NAME = "tdmcp-hub";
export const HUB_PEER_TTL_MS = 45_000;
export const HUB_SWEEP_INTERVAL_MS = 10_000;
export const HUB_HEALTH_PATH = "/health";

export function defaultHubBaseUrl(
	host = HUB_DEFAULT_HOST,
	port = HUB_DEFAULT_PORT,
): string {
	return `http://${host}:${port}`;
}
