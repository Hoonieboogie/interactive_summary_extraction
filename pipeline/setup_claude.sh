#!/usr/bin/env bash
# setup_claude.sh — Install Claude Code + persist SSH/git config on RunPod
# Usage: bash pipeline/setup_claude.sh

set -euo pipefail

echo "=== Claude Code Setup ==="

# 1. Install Claude Code
if ! command -v claude &> /dev/null; then
    echo "Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code
    echo "Installed: $(claude --version)"
else
    echo "Claude Code already installed: $(claude --version)"
fi

# 2. Restore SSH key from network volume (if previously saved)
if [ -f /workspace/.ssh/id_ed25519 ]; then
    echo "Restoring SSH key from network volume..."
    mkdir -p ~/.ssh
    cp /workspace/.ssh/id_ed25519 ~/.ssh/id_ed25519
    cp /workspace/.ssh/id_ed25519.pub ~/.ssh/id_ed25519.pub
    chmod 600 ~/.ssh/id_ed25519
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
    echo "SSH key restored"
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "SSH key exists — saving to network volume for persistence..."
    mkdir -p /workspace/.ssh
    cp ~/.ssh/id_ed25519 /workspace/.ssh/id_ed25519
    cp ~/.ssh/id_ed25519.pub /workspace/.ssh/id_ed25519.pub
    chmod 600 /workspace/.ssh/id_ed25519
    echo "SSH key saved to /workspace/.ssh/"
else
    echo "No SSH key found. Generating new key..."
    mkdir -p ~/.ssh
    ssh-keygen -t ed25519 -C "runpod" -f ~/.ssh/id_ed25519 -N ""
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
    # Persist to network volume
    mkdir -p /workspace/.ssh
    cp ~/.ssh/id_ed25519 /workspace/.ssh/id_ed25519
    cp ~/.ssh/id_ed25519.pub /workspace/.ssh/id_ed25519.pub
    echo ""
    echo "Add this key to GitHub → Settings → SSH Keys:"
    cat ~/.ssh/id_ed25519.pub
    echo ""
fi

# 3. Set git identity
git config --global user.name "hoonscream"
git config --global user.email "im_1703@IM-1703ui-MacBookPro.local"

# 4. Ensure remote uses SSH
cd /workspace/interactive_summary_extraction
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$REMOTE_URL" == https://* ]]; then
    echo "Switching origin to SSH..."
    git remote set-url origin git@github.com:Hoonieboogie/interactive_summary_extraction.git
fi

echo ""
echo "=== Claude Code setup complete ==="
echo "Run 'claude' to start."
