## Running AdGuard Home at home, but the avg latency number kept bugging me

Been running AdGuard Home for about 6 months. The blocking works great, but there's always this one thing that bothered me — the built-in dashboard shows **one single average latency number**, and that's it. No idea which domain is dragging it down.

Is it some IoT device hammering a domain that doesn't exist? Is one of my upstreams flaky? The stock UI simply doesn't tell you.

## So I built a log analysis tool

ADGH's query log is actually quite detailed — it has everything. What's missing is **per-domain aggregation**. After a few evenings with DeepSeek, I put together a small tool:

**AdGuard Home Boost** — an enhanced frontend dashboard for AdGuard Home.

How it works: it pulls your ADGH query logs, groups them by domain, computes percentile stats (P50/P95/P99/Max), separates cached vs uncached, and shows you a clean sorted table.

## What you get

Open the page, hit refresh, a few seconds later:

- **Which domain is slowest** — sorted by P95 descending, worst first
- **Why it's slow** — upstream latency vs cache miss? cached/uncached shown separately
- **Who's querying it** — expand any domain to see device IP + hostname
- **Blocked queries** — which rule blocked it and how many times
- **Trend chart** — dual Y-axis showing query volume + block rate over time

After looking at the data, I found a Xiaomi IoT device hammering a China-only DNS server from my network. Put it in an isolated VLAN and avg latency dropped from 180ms to 25ms.

## Deployment

Docker, one line:

```bash
docker run -d --name adguard-home-boost \
  -p 3080:3080 \
  -e ADGH_URL=http://your-adguard-address \
  -e ADGH_USER=your-username \
  -e ADGH_PASSWD=your-password \
  xiebaiyuan/adguard-home-boost:latest
```

Open http://localhost:3080 and you're good.

No Docker? Node 18+ works too:

```bash
git clone https://github.com/xiebaiyuan/adguard-home-boost
cd adguard-home-boost
npm install
npm run dev
```

Drop the repo URL into any AI (Claude/ChatGPT/DeepSeek) and say "deploy this" — it'll handle the rest.

## Who this is for

- You run AdGuard Home and want to know **which specific domains are slow**
- You suspect a device is leaking DNS queries upstream
- You want to catch mDNS or weird domains leaking to public resolvers

Strange domains with abnormal latency, mDNS leaking upstream, a device hammering nonexistent domains — open the dashboard, it's all there.

---

GitHub: [github.com/xiebaiyuan/adguard-home-boost](https://github.com/xiebaiyuan/adguard-home-boost)
