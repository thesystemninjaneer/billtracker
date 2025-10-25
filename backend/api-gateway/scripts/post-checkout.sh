#!/bin/bash
VERSION=$(git describe --tags --always)
echo "$VERSION" > backend/api-gateway/version.txt