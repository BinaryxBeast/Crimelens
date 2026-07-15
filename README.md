# CrimeLens — Setup & Usage Guide

## 🚀 Quick Start

### Prerequisites
1. **Google Cloud Maps API Key** → [Google Cloud Console](https://console.cloud.google.com/) → Enable **Maps JavaScript API** → Create an API key
2. **Supabase Project** → [supabase.com](https://supabase.com) → New Project → copy URL + anon key

### 1. Configure Environment
Edit `.env` in the project root:
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your_key_here
```

### 2. Set Up Supabase Database
In your Supabase project → **SQL Editor**:
1. Run `supabase/schema.sql` (creates tables)
2. Run `supabase/seed.sql` (seeds synthetic Karnataka data)

### 3. Create a User
In Supabase → **Authentication** → **Users** → **Invite User**  
Or use the "Add User" button and set a password manually.

### 4. Start the App
```bash
npm install
npm run dev     # → http://localhost:5173
```

Log in with the credentials you created in Supabase Auth.

---

## 📖 Feature Guide

### 📊 Dashboard
- **5 KPI cards**: total, open, investigating, closed rate, high severity
- **Emerging Threat Alerts**: Auto-detected crime spikes using z-score analysis
- **Monthly trend** area chart (12 months)
- **Crime type breakdown** donut chart
- **Top districts** horizontal bar chart
- **Case status trends** stacked bar chart (6 months)

### 🗺️ Crime Map
- **Google Maps heatmap** weighted by incident severity
- **Karnataka state lock**: Map is restricted to Karnataka by default with a dark fog mask outside the state boundary and a glowing blue border
- **Explore toggle**: Toggle switch to allow/deny exploration outside Karnataka
- **Interactive popups**: Click any marker for FIR, crime type, district, status
- **Time-of-day panel**: Distribution across day periods
- **Top hotspots panel**: Top 5 crime districts with bar charts

### 🕸️ Network Analysis  
- **Force-directed graph**: Offenders → Incidents → Districts
- **Click any node** → Detail panel (risk score, MO, linked cases)
- **Animated particles** on edges show criminal involvement
- **Offender search**: Search by name

### 🤖 AI Predictive Intelligence
- **District Risk Rankings** scored 0-100 with circular progress rings
- **Anomaly detection**: Z-score flags > 1.8σ above mean
- **Socio-economic overlay**: Urbanisation vs. risk comparison
- **Formula card**: Shows the exact scoring formula

### 📋 Reports & Records
- **Full CRUD** synced to Supabase in real-time
- Sort any column, full-text search
- **Export to CSV**
- Add/edit modal with all fields
- Delete with confirmation

---

## 🗂️ Project Structure
```
src/
  supabaseClient.js, store/, hooks/, components/, pages/
supabase/
  schema.sql, seed.sql
```

## 🛠️ Tech Stack
React 18 + Vite · Google Maps JavaScript API · Recharts · React Force Graph · Supabase · Zustand · React Router
