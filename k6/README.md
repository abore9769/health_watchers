# k6 Load Testing

This directory contains k6 load testing scripts for the Health Watchers API.

## Prerequisites

- k6 installed: https://k6.io/docs/getting-started/installation/
- API running on `http://localhost:3001` (or set `BASE_URL` env var)
- Valid auth token (set `AUTH_TOKEN` env var)

## Test Scenarios

### Smoke Test (Baseline)
- 1 virtual user, 1 minute
- Verifies all endpoints respond correctly
- Establishes baseline response times

```bash
k6 run smoke-test.js
```

### Load Test (Normal Traffic)
- 50 virtual users, 10 minutes
- Simulates normal clinic day
- Target: p95 < 500ms, error rate < 1%

```bash
k6 run load-test.js
```

### Stress Test (Peak Traffic)
- Ramp up to 200 virtual users over 5 minutes
- Hold for 10 minutes
- Ramp down
- Identifies breaking point

```bash
k6 run stress-test.js
```

### Spike Test
- Sudden spike to 500 users for 1 minute
- Verifies system recovery after spike

```bash
k6 run spike-test.js
```

## Running with Custom Configuration

```bash
# Set base URL
BASE_URL=https://api.example.com k6 run load-test.js

# Set auth token
AUTH_TOKEN=your_token_here k6 run load-test.js

# Both
BASE_URL=https://api.example.com AUTH_TOKEN=your_token k6 run load-test.js
```

## Performance Thresholds

- p95 response time < 500ms
- p99 response time < 2000ms
- Error rate < 1%
- Throughput > 100 req/s

## CI Integration

Smoke test runs on every PR:

```bash
k6 run --vus 1 --duration 1m smoke-test.js
```

Full load test runs weekly via GitHub Actions.

## Interpreting Results

- **http_req_duration**: Response time distribution
- **http_req_failed**: Percentage of failed requests
- **group_duration**: Time spent in each test group
- **checks**: Pass/fail assertions

## Troubleshooting

- **Connection refused**: Ensure API is running
- **Auth failures**: Verify `AUTH_TOKEN` is valid
- **High error rates**: Check API logs for errors
- **Timeout errors**: Increase threshold or reduce VU count
