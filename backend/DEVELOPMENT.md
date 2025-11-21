# バックエンド開発ガイド

このガイドでは、バックエンド開発に必要なツールのセットアップ、コード品質管理、テスト実行方法について説明します。

## 📋 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [コード品質チェック](#コード品質チェック)
3. [テスト](#テスト)
4. [設定ファイル](#設定ファイル)
5. [開発ワークフロー](#開発ワークフロー)
6. [依存関係の管理](#依存関係の管理)
7. [トラブルシューティング](#トラブルシューティング)

---

## 🛠️ 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
# 本番用依存関係のみ
pip install -r requirements.txt

# 開発用依存関係（Lintツール含む）
pip install -r requirements-dev.txt

# または Makefile を使用
make install-dev
```

### 2. Pre-commit フックのセットアップ（推奨）

```bash
pip install pre-commit
pre-commit install
```

これにより、コミット時に自動的にコード品質チェックが実行されます。

### 3. 導入されているツール

このプロジェクトでは以下のコード品質・開発ツールが導入されています：

#### コードスタイル
- **Black**: コードフォーマッター（自動整形）
- **isort**: import文の並び替え
- **flake8**: PEP8準拠チェック

#### 型チェック
- **mypy**: 型アノテーションの検証

#### セキュリティ
- **pip-audit**: 依存関係の脆弱性スキャン（Python公式プロジェクト）

#### テスト
- **pytest**: ユニットテスト
- **pytest-cov**: カバレッジ測定
- **pytest-xdist**: 並列テスト実行
- **pytest-mock**: モック機能

#### 設定ファイル
- `.flake8` - flake8の設定
- `pyproject.toml` - black, isort, mypy, pytestの設定
- `.pre-commit-config.yaml` - pre-commitフックの設定
- `Makefile` - 便利なコマンド集

---

## 📋 コード品質チェック

### Makefileを使用（推奨）

```bash
# すべてのチェックを実行
make check-all

# 個別実行
make format        # コードフォーマット
make format-check  # フォーマットチェック（変更なし）
make lint          # Lintチェック（flake8, mypy）
make security      # セキュリティスキャン
make test          # テスト実行
make test-cov      # カバレッジ付きテスト
```

### 手動実行

#### コードフォーマット

```bash
# Black（自動整形）
black app/ tests/

# isort（import文の整理）
isort app/ tests/

# フォーマットチェックのみ（変更しない）
black --check app/ tests/
isort --check-only app/ tests/
```

#### Lintチェック

```bash
# flake8（コードスタイルチェック）
flake8 app/

# mypy（型チェック）
mypy app/
```

#### セキュリティチェック

```bash
# 依存関係の脆弱性スキャン
pip-audit --desc

# または Makefile を使用
make security
```

---

## 🧪 テスト

```bash
# 通常のテスト実行
pytest

# カバレッジレポート付き
pytest --cov=app --cov-report=html --cov-report=term

# または Makefile
make test
make test-cov

# カバレッジレポートの確認
open htmlcov/index.html
```

---

## ⚙️ 設定ファイル

### `.flake8`
- Flake8の設定（行の長さ、除外ディレクトリなど）
- CI/CDと同じルールで実行

### `pyproject.toml`
- Black、isort、mypyの設定
- pytestの設定も含む

### `.pre-commit-config.yaml`
- Git commitの前に自動実行されるチェック
- フォーマット、Lint、セキュリティチェック

---

## 🔄 開発ワークフロー

### 推奨フロー

1. **コード変更**
   ```bash
   # 自動フォーマット
   make format
   ```

2. **ローカルチェック**
   ```bash
   # すべてのチェックを実行
   make check-all
   ```

3. **コミット**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # → pre-commitフックが自動実行される
   ```

4. **プッシュ**
   ```bash
   git push
   # → GitHub ActionsでCI/CDが実行される
   ```

### CI/CDと同じチェックを実行

```bash
# CI/CDと完全に同じチェックを実行
make format-check
make lint
make security
make test-cov
```

---

## 📦 依存関係の管理

### 新しいパッケージの追加

```bash
# 本番用
echo "new-package==1.0.0" >> requirements.txt
pip install -r requirements.txt

# 開発用のみ
echo "dev-package==1.0.0" >> requirements-dev.txt
pip install -r requirements-dev.txt
```

### セキュリティアップデート

```bash
# 脆弱性チェック
make security

# 更新が必要な場合
pip install --upgrade package-name
pip freeze | grep package-name  # バージョン確認
# requirements.txt に反映
```

---

## 🐛 トラブルシューティング

### flake8が見つからない

```bash
pip install -r requirements-dev.txt
```

### pre-commitが動かない

```bash
pre-commit install
pre-commit run --all-files  # 全ファイルに対して実行
```

### mypyのエラーが多すぎる

`pyproject.toml`で型チェックの厳密度を調整できます：

```toml
[tool.mypy]
disallow_untyped_defs = false  # 型なし関数を許可
```

---

## � CI/CDとの連携

GitHub Actionsで以下のチェックが自動実行されます：

- **backend-test**: pytest（カバレッジ測定付き）
- **backend-lint**: flake8, black, isort, mypy
- **security-scan**: pip-audit
- **docker-build**: Dockerイメージビルド

ローカルで同じチェックを実行：
```bash
make check-all  # すべてのチェックを実行
```

設定ファイル: `.github/workflows/ci.yml`

---

## �📚 参考資料

- [Black Documentation](https://black.readthedocs.io/)
- [flake8 Documentation](https://flake8.pycqa.org/)
- [isort Documentation](https://pycqa.github.io/isort/)
- [mypy Documentation](https://mypy.readthedocs.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [pre-commit Documentation](https://pre-commit.com/)

---

## 🔗 関連ドキュメント

- [プロジェクトREADME](../README.md) - プロジェクト全体の概要
- [テストガイド](../TESTING.md) - テスト戦略とベストプラクティス
- [Pytestガイド](PYTEST_GUIDE.md) - Pytestの詳細な使い方
- [Dockerガイド](../DOCKER.md) - Docker環境での開発
