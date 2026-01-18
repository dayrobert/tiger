# Tiger — eBay Purchase Tracker

Minimal Electron + TypeScript starter to track eBay purchases and run scheduled
price-check scripts. Data is stored in MySQL.

Quick start

1. Install dependencies

```bash
cd ~/Projects/tiger
npm install
```

2. Configure environment (create a `.env` file or export env vars)

```
DB_HOST=192.168.1.100
DB_USER=myuser
DB_PASSWORD=secret
DB_NAME=tiger
EBAY_CLIENT_ID=your-ebay-client-id
EBAY_CLIENT_SECRET=your-ebay-client-secret
EBAY_TOKEN=your-ebay-oauth-token
```

To get your eBay API credentials:
1. Go to https://developer.ebay.com/
2. Sign in with your eBay account
3. Create an application in the Developer Portal
4. Copy your Client ID and Client Secret
5. Add them to your `.env` file

3. Run database migrations (creates tables)

```bash
npm run migrate
```

4. Run the Electron app

```bash
npm run start
```

Scheduled price checks

- You can run the script manually with `npm run check-prices`.
- To run unattended on your home server, use `cron` to execute the script
  periodically. Example crontab entry (runs every 6 hours):

```cron
0 */6 * * * cd /Users/rday/Projects/tiger && /usr/bin/env npm run check-prices >> /var/log/tiger-price-check.log 2>&1
```

Notes

- The `src/scripts/priceChecker.ts` contains a placeholder `fetchCurrentPrice`
  that calls the eBay Browse API; you must supply valid eBay OAuth token(s)
  and possibly adjust the endpoint and parsing to match your API access.
- The script is intentionally minimal — it updates `items.current_price` and
  `items.last_checked_at`.

Next steps I can take

- Wire IPC endpoints to add/list items and purchases from the UI.
- Add a small form in the renderer to create items and add purchases.
- Implement OAuth flow for eBay or scrape fallback (note scraping may
  violate terms of service).
# tiger
# tiger
