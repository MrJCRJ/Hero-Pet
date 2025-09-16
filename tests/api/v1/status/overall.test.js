import http from "http";

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "localhost", port: 3000, path, method: "GET" },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("GET /api/v1/status overall", () => {
  test("deve conter dependencies.overall = healthy", async () => {
    const { status, json } = await getJson("/api/v1/status");
    expect(status).toBe(200);
    expect(json.dependencies).toBeDefined();
    expect(json.dependencies.overall).toBe("healthy");
  });
});
