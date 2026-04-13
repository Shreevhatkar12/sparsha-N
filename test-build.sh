#!/bin/bash
cd /home/seucra/Runes/projects/sparsha
npm install --prefix backend
npm install --prefix frontend --legacy-peer-deps
npm install react-is --prefix frontend --legacy-peer-deps

echo "TypeScript check backend..."
cd backend
npx tsc --noEmit
echo "TypeScript check frontend..."
cd ../frontend
npx tsc --noEmit
