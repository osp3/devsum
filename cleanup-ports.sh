#!/bin/bash

# DevSum Port Cleanup Script
# Kills any processes running on development ports

echo "🧹 DevSum Port Cleanup"
echo "====================="

# Function to kill process on a specific port
kill_port() {
  local port=$1
  local service=$2
  
  echo "Checking port $port ($service)..."
  
  # Find process ID using the port
  local pid=$(lsof -ti :$port 2>/dev/null)
  
  if [ -n "$pid" ]; then
    echo "  🔍 Found process $pid on port $port"
    kill -9 $pid 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "  ✅ Killed process $pid on port $port"
    else
      echo "  ❌ Failed to kill process $pid on port $port"
    fi
  else
    echo "  ✅ Port $port is free"
  fi
}

# Clean up development ports
kill_port 3000 "Backend/Express"
kill_port 5173 "Frontend/Vite"

# Also check for common alternative ports
kill_port 3001 "Backend Alt"
kill_port 5174 "Frontend Alt"

echo ""
echo "🎯 Port cleanup completed!"
echo ""
echo "You can now run:"
echo "  npm run dev        # Start both frontend and backend"
echo "  npm run cleanup-ports  # Run this script via npm" 