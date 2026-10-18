#!/usr/bin/env bash
set -euo pipefail
cd /workspace/diffraction-lab-3d
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm test
npm run build
