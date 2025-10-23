import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

// describe('Hello World worker', () => {
// 	it('responds with Hello World! (unit style)', async () => {
// 		const request = new Request('http://example.com');
// 		// Create an empty context to pass to `worker.fetch()`.
// 		const ctx = createExecutionContext();
// 		const response = await worker.fetch(request, env, ctx);
// 		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
// 		await waitOnExecutionContext(ctx);
// 		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
// 	});

// 	it('responds with Hello World! (integration style)', async () => {
// 		const response = await SELF.fetch('http://example.com');
// 		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
// 	});
// });

describe("Image Worker", () => {
	it("returns 404 for non-existing image", async () => {
		const request = new Request("http://example.com/non-existing-image.jpg");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Image not found");
	});

	it("caches the image after first fetch", async () => {
		const imageUrl = "http://example.com/profile-11.jpg";
		const request = new Request(imageUrl);
		const ctx = createExecutionContext();
		
		// First fetch - should fetch from R2
		let response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('X-Cache-Status')).toBe('MISS');
	});

	it("returns cached image on subsequent fetch", async () => {
		const imageUrl = "http://example.com/profile-11.jpg";
		const request = new Request(imageUrl);
		const ctx = createExecutionContext();

		// Ensure the cache is populated within this test's runtime by doing an initial fetch
		let first = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(first.status).toBe(200);
		expect(first.headers.get('X-Cache-Status')).toBe('MISS');

		// Second fetch - should return cached response (HIT)
		let response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('X-Cache-Status')).toBe('HIT');
	});
});