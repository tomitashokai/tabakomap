#!/bin/bash
# クラウドセッション（claude.ai/code）でだけ依存をインストールする。
#
# クラウドVMはリポジトリをクローンしただけの状態で始まるので node_modules が無い。
# 一方ローカルにはすでに入っているし、npm install は postinstall で任意のコードが
# 走るため意図せず実行したくない。CLAUDE_CODE_REMOTE はクラウドのセッションVMでのみ
# true になるので、それを見て切り分ける。
#
# 呼び出しは .claude/settings.json の SessionStart フック。
# クラウド環境の「セットアップスクリプト」に npm install を書いてはいけない。
# あれはリポジトリのクローン前に走るので package.json が無く ENOENT で落ちる。

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# package-lock.json があるので ci を優先する。ロックがずれていたら install に落とす
npm ci || npm install

exit 0
