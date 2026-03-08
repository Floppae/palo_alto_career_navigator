import { describe, it } from "node:test";
import assert from "node:assert";
import { POST } from "../../app/api/analyze/route";
import { validateInput } from "../../server/validate";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

describe("POST /api/analyze", () => {
  it("happy path: valid input returns 200 with full result", async () => {
    const res = await post({ targetRole: "Product Manager", resumeText: "Led features.", skills: ["Jira"], certifications: [], experience: "5 years." });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(data.targetRole, "Product Manager");
    assert.strictEqual(typeof data.readinessScore, "number");
    assert.ok((data.readinessScore as number) >= 0 && (data.readinessScore as number) <= 100);
    assert.strictEqual(typeof data.summary, "string");
    assert.ok(Array.isArray(data.skillsGrid));
    assert.ok(Array.isArray(data.learningRoadmap));
  });

  it("edge case: empty target role returns 400 with clear error", async () => {
    const res = await post({ targetRole: "", resumeText: "", skills: [], certifications: [], experience: "" });
    assert.strictEqual(res.status, 400);
    const data = (await res.json()) as { error?: string };
    assert.strictEqual(data.error, "Target role can’t be blank.");
  });

  it("edge case: invalid JSON returns 400", async () => {
    const res = await POST(new Request("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: "not json {" }));
    assert.strictEqual(res.status, 400);
    assert.ok((await res.json() as { error?: string }).error?.toLowerCase().includes("json"));
  });
});

describe("validateInput", () => {
  it("rejects null body", () => {
    const r = validateInput(null);
    assert.strictEqual(r.success, false);
    assert.strictEqual((r as { error: string }).error, "Body should be a JSON object.");
  });
  it("rejects empty target role", () => {
    const r = validateInput({});
    assert.strictEqual(r.success, false);
    assert.strictEqual((r as { error: string }).error, "Target role can’t be blank.");
  });
});
