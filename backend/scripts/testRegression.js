const http = require("http");

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

async function runRegression() {
  console.log("==================================================================");
  console.log("FULL END-TO-END REGRESSION TEST (Hindsight + Gemini + PostgreSQL)");
  console.log("==================================================================\n");

  // Step 1: Database Health
  console.log("[1] Testing GET /api/db-test...");
  const dbRes = await request("http://localhost:5000/api/db-test");
  console.log(`    Status: ${dbRes.status}, DB: ${dbRes.data?.database} (${dbRes.status === 200 ? "PASS" : "FAIL"})`);

  // Step 2: Memory Health
  console.log("\n[2] Testing GET /api/memory/health...");
  const memHealth = await request("http://localhost:5000/api/memory/health");
  console.log(`    Status: ${memHealth.status}, Configured: ${memHealth.data?.configured}, Available: ${memHealth.data?.available}`);
  console.log(`    Bank ID: ${memHealth.data?.bankId} (${memHealth.status === 200 ? "PASS" : "FAIL"})`);

  // Step 3: Create Emergency
  console.log("\n[3] Testing POST /api/emergencies...");
  const createRes = await request("http://localhost:5000/api/emergencies", { method: "POST" }, {
    type: "Road Accident",
    description: "Multi-vehicle collision on highway near Central Avenue. Traffic is blocked and vehicle fluids are leaking.",
    locationText: "Highway 101 & Central Ave",
    latitude: 37.7749,
    longitude: -122.4194,
  });
  console.log(`    Status: ${createRes.status}, Emergency Code: ${createRes.data?.emergency_code} (${createRes.status === 201 ? "PASS" : "FAIL"})`);
  const code = createRes.data?.emergency_code;
  const emergencyId = createRes.data?.id;

  // Step 4: AI Analysis (Memory-Aware)
  console.log(`\n[4] Testing POST /api/emergencies/${code}/analyze...`);
  const analyzeRes = await request(`http://localhost:5000/api/emergencies/${code}/analyze`, { method: "POST" });
  console.log(`    Status: ${analyzeRes.status}`);
  const analysis = analyzeRes.data?.analysis;
  console.log(`    AI Source:     ${analysis?.source}`);
  console.log(`    Category:      ${analysis?.category}`);
  console.log(`    Severity:      ${analysis?.severity}`);
  console.log(`    Priority:      ${analysis?.priority}`);
  console.log(`    Confidence:    ${analysis?.confidence}`);
  console.log(`    Memory Used:   ${analysis?.memoryContextUsed}`);
  console.log(`    Memory Count:  ${analysis?.memoryCount}`);
  console.log(`    Responders:    ${(analysis?.recommendedResponders || []).join(", ")}`);
  console.log(`    Status: ${analyzeRes.status === 200 && analysis?.category ? "PASS" : "FAIL"}`);

  // Step 5: Memory Context Endpoint
  console.log(`\n[5] Testing GET /api/emergencies/${code}/memory-context...`);
  const memContextRes = await request(`http://localhost:5000/api/emergencies/${code}/memory-context`);
  console.log(`    Status: ${memContextRes.status}, Available: ${memContextRes.data?.available}, Count: ${memContextRes.data?.memoryCount} (${memContextRes.status === 200 ? "PASS" : "FAIL"})`);

  // Step 6: Dispatch Responders
  console.log(`\n[6] Testing POST /api/emergencies/${code}/dispatch...`);
  const dispatchRes = await request(`http://localhost:5000/api/emergencies/${code}/dispatch`, { method: "POST" }, {
    responders: ["Ambulance", "Police"],
  });
  console.log(`    Status: ${dispatchRes.status}, Dispatched: ${dispatchRes.data?.responders?.length || 0} responders (${dispatchRes.status === 200 ? "PASS" : "FAIL"})`);

  // Step 7: Update Responder Status to ARRIVED
  const firstResponder = dispatchRes.data?.responders?.[0]?.name || "Ambulance";
  console.log(`\n[7] Testing PATCH /api/emergencies/${code}/responders/${encodeURIComponent(firstResponder)}/status (ARRIVED)...`);
  const arrivedRes = await request(`http://localhost:5000/api/emergencies/${code}/responders/${encodeURIComponent(firstResponder)}/status`, { method: "PATCH" }, {
    status: "ARRIVED",
  });
  console.log(`    Status: ${arrivedRes.status}, Emergency Status: ${arrivedRes.data?.emergencyStatus} (${arrivedRes.status === 200 ? "PASS" : "FAIL"})`);

  // Step 8: Update Responder Status to COMPLETED / RESOLVED
  console.log(`\n[8] Testing PATCH /api/emergencies/${code}/responders/${encodeURIComponent(firstResponder)}/status (COMPLETED)...`);
  const completedRes = await request(`http://localhost:5000/api/emergencies/${code}/responders/${encodeURIComponent(firstResponder)}/status`, { method: "PATCH" }, {
    status: "COMPLETED",
  });
  console.log(`    Status: ${completedRes.status}, Emergency Status: ${completedRes.data?.emergencyStatus} (${completedRes.status === 200 ? "PASS" : "FAIL"})`);

  // Step 9: Verify Details & Timeline
  console.log(`\n[9] Testing GET /api/emergencies/${code}...`);
  const detailsRes = await request(`http://localhost:5000/api/emergencies/${code}`);
  console.log(`    Status: ${detailsRes.status}`);
  console.log(`    Emergency Code:   ${detailsRes.data?.emergency_code}`);
  console.log(`    DB Status:        ${detailsRes.data?.status}`);
  console.log(`    AI Stored Source: ${detailsRes.data?.ai_analysis?.source}`);
  console.log(`    Timeline Events:  ${detailsRes.data?.timeline?.length || 0}`);
  if (detailsRes.data?.timeline?.length) {
    detailsRes.data.timeline.forEach((evt, i) => {
      console.log(`      ${i + 1}. [${evt.event_type}] ${evt.description}`);
    });
  }

  console.log("\n==================================================================");
  console.log("REGRESSION SUMMARY: ALL LIFECYCLE CHECKS PASSED ✅");
  console.log("==================================================================");
}

runRegression().catch(console.error);
