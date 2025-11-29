#!/usr/bin/env bash
#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Amazon.com, Inc. or its affiliates. All Rights Reserved.
# This software is distributed under the MIT License.
#-------------------------------------------------------------------------------------------------------------
#
# Docs: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
#

set -e

# Clean up
cleanup() {
    echo "Cleaning up..."
    rm -rf /tmp/awscli-install
    exit ${1:-0}
}

# Handle errors
error() {
    echo "ERROR: $*" >&2
    cleanup 1
}

# Ensure we're running as root
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root"
fi

if [ ! -f /etc/debian_version ]; then
    echo "Unsupported Linux distribution. Must use debian (for now)."
    exit 1
fi

# Detect architecture
ARCH=$(dpkg --print-architecture)
case "$ARCH" in
    amd64)
        ARCH_SUFFIX="x86_64"
        ;;
    arm64)
        ARCH_SUFFIX="aarch64"
        ;;
    *)
        error "Unsupported architecture: $ARCH. Only amd64 and arm64 are supported."
        ;;
esac

# Set OS to linux for Debian-based systems
OS="linux"

ls -al

# Create temp directory
mkdir -p /tmp/awscli-install
cd /tmp/awscli-install

# Download and install aws-cli
DOWNLOAD_URL="https://awscli.amazonaws.com/awscli-exe-${OS}-${ARCH_SUFFIX}.zip"

echo "Downloading awscli from ${DOWNLOAD_URL}..."
curl --proto '=https' --tlsv1.2 -sSfL -o awscliv2.zip "${DOWNLOAD_URL}"

echo "Extracting awscli..."
unzip awscliv2.zip

echo "Install awscli..."
./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli

echo "awscli installation completed!"
cleanup 0
