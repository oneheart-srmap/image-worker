// @ts-nocheck
/**
 * Cloudflare worker to edge cache and serve images stored in R2 bucket
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // @dev Extract the image path from the Worker URL
    const imagePath = url.pathname.slice(1); // removes leading '/'

    // @dev R2 Public Dev URL (replace with your actual R2 Dev URL)
    const r2DevUrl = `https://pub-3a6a6a909a954257952f55f20000d7ad.r2.dev/${imagePath}`;

    // @dev Optional query parameters for resizing
	// @notice These parameters depend on Cloudflare's image resizing capabilities
	// @notice needs custom domain instead of r2.dev to work properly
    const width = url.searchParams.get("w");
    const height = url.searchParams.get("h");
    const quality = url.searchParams.get("q") || "85";
    const fit = url.searchParams.get("fit") || "cover";

    const cache = caches.default;
    let response = await cache.match(request);

    if (response) {
      // Clone the cached response so we can annotate it as a cache HIT
      response = new Response(response.body, response);
      response.headers.set("X-Cache-Status", "HIT");
      return response;
    }

    if (!response) {
      const cfOptions = {};

      if (width || height) {
        cfOptions.image = {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          quality: parseInt(quality),
          fit, // cover, contain, scale-down, etc.
        };
      }

      // @dev Fetch from R2 Dev URL with optional resizing
      response = await fetch(r2DevUrl, { cf: Object.keys(cfOptions).length ? cfOptions : undefined });

      if (!response.ok) {
        return new Response("Image not found", { status: 404 });
      }

      // @dev Add cache headers (1 day) and indicate a cache MISS
      response = new Response(response.body, response);
      response.headers.set("Cache-Control", "public, max-age=86400");
      response.headers.set("X-Cache-Status", "MISS");
      await cache.put(request, response.clone());
    }

    return response;
  },
};
