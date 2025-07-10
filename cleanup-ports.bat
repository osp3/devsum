@echo off
:: DevSum Port Cleanup Script (Windows)
:: Kills any processes running on development ports

echo 🧹 DevSum Port Cleanup (Windows)
echo ================================

echo Checking port 3000 (Backend/Express)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo   🔍 Found process %%a on port 3000
    taskkill /f /pid %%a >nul 2>&1
    if errorlevel 1 (
        echo   ❌ Failed to kill process %%a
    ) else (
        echo   ✅ Killed process %%a on port 3000
    )
)

echo Checking port 5173 (Frontend/Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo   🔍 Found process %%a on port 5173
    taskkill /f /pid %%a >nul 2>&1
    if errorlevel 1 (
        echo   ❌ Failed to kill process %%a
    ) else (
        echo   ✅ Killed process %%a on port 5173
    )
)

echo.
echo 🎯 Port cleanup completed!
echo.
echo You can now run:
echo   npm run dev        # Start both frontend and backend
echo   npm run cleanup-ports  # Run this script via npm
pause 