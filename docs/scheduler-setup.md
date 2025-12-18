# API Scheduler Setup Guide

Since Vercel Cron is not available on the free tier, you can use these free alternatives to run your schedules automatically.

## Option 1: Client-Side Auto Check (Easiest)
We have implemented an **"Auto Check"** feature directly in the dashboard.
1. Go to **API Scheduler** page.
2. Click the **"Auto Check: OFF"** button to toggle it **ON**.
3. Keep this tab open on your computer.
4. The system will check for due tasks every **1 minute**.

## Option 2: External Free Cron Service (Recommended for 24/7)
Use a free service like [cron-job.org](https://cron-job.org/en/) to trigger your scheduler endpoint.

1. **Sign up** at [cron-job.org](https://cron-job.org/en/) (it's free).
2. **Create a Cronjob**:
   - **Title**: `SuperlBoard Scheduler`
   - **URL**: `https://your-app-domain.com/api/scheduler/cron`
   - **Execution schedule**: Every 1 minute (or 5 minutes).
3. **Save**.
4. The service will hit your API internally, and your API will check if any specific tasks need to run.

## Option 3: GitHub Actions
If your project is hosted on GitHub, you can use GitHub Actions to trigger the endpoint.

Create `.github/workflows/scheduler.yml`:

```yaml
name: Trigger API Scheduler
on:
  schedule:
    - cron: '*/5 * * * *' # Runs every 5 minutes
jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call API Scheduler
        run: |
          curl -X GET https://your-app-domain.com/api/scheduler/cron
```
