#!/bin/bash
# Deploy prospecting tool to localhost.run (L3-5 tunnel)

cd /home/node/.openclaw/workspace/prospecting-tool

echo "Starting Next.js server on port 3000..."
pnpm dev &

echo "Waiting for server to start..."
sleep 5

echo "Creating tunnel with localhost.run..."
# localhost.run creates a public URL tunneling to localhost:3000
ssh -R 80:localhost:3000 ssh.localhost.run
