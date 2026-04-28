# 🚀 Quick Start Guide

## What You Need

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
2. **Node.js 18+** - Already installed ✓
3. **Python 3.11+** - Already installed ✓

---

## Start Everything (One Command)

```powershell
.\start.ps1
```

This script will:
- ✅ Check if Docker is running
- ✅ Start MongoDB container
- ✅ Start FastAPI backend (port 8001)
- ✅ Start React frontend (port 3000)

---

## If Docker Desktop Isn't Running

1. **Start Docker Desktop** from Windows Start menu
2. Wait for it to say "Docker Desktop is running"
3. Run `.\start.ps1` again

---

## Login

Open **http://localhost:3000**

```
Email: admin@splash.com
Password: Splash@2026
```

---

## What's Already Set Up

✅ **MongoDB** - Running in Docker  
✅ **Sui Contract** - Deployed to testnet  
✅ **Frontend** - All Emergent dependencies removed  
✅ **Backend** - Connected to Docker MongoDB  
✅ **Demo Data** - 12 recipients + 20 transfers pre-seeded  

---

## Troubleshooting

### "Can't sign in"

**Check backend is running:**
```powershell
# Should show backend process
Get-Process | Where-Object {$_.ProcessName -like "*python*"}
```

**Check MongoDB:**
```powershell
docker ps
# Should show splash-mongodb container
```

**Restart everything:**
```powershell
docker-compose down
.\start.ps1
```

### "Docker not found"

Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "Port 27017 already in use"

Stop any local MongoDB service:
```powershell
net stop MongoDB
```

---

## Stop Everything

```powershell
# Stop MongoDB
docker-compose down

# Stop backend/frontend: Close their PowerShell windows or Ctrl+C
```

---

## Manual Start (if you prefer)

```powershell
# Terminal 1 - MongoDB
docker-compose up -d

# Terminal 2 - Backend
cd backend
uvicorn server:app --reload --port 8001

# Terminal 3 - Frontend  
cd frontend
npm start
```

---

## Next Steps

1. **Create a transfer** - Click "Send Payout" in the dashboard
2. **View on Sui Explorer** - Click the explorer link in transfer details
3. **Check the PDF receipt** - Download from the transfer menu

The app now records **real settlements on Sui testnet**! 🎉
