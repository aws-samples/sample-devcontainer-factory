#!/usr/bin/env bash
#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Amazon.com, Inc. or its affiliates. All Rights Reserved.
# This software is distributed under the MIT License.
#-------------------------------------------------------------------------------------------------------------
#

set -e

echo "Installing kiro-cli under user: ${_REMOTE_USER}"
curl -fsSL https://cli.kiro.dev/install | sudo -u "$_REMOTE_USER" bash

echo "kiro-cli installation completed!"
