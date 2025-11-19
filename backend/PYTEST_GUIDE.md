# pytest 使い方ガイド

## 🚀 基本的な実行方法

```bash
# すべてのテストを実行
pytest

# 詳細表示（verbose）
pytest -v

# 特定のファイルを実行
pytest tests/test_todo.py

# 特定のクラスを実行
pytest tests/test_todo.py::TestTodoEndpoints

# 特定のテスト関数を実行
pytest tests/test_todo.py::TestTodoEndpoints::test_create_todo

# パターンマッチでテストを実行（名前に"auth"を含むテスト）
pytest -k "auth"

# 失敗したテストだけ再実行
pytest --lf  # last failed

# 最初の失敗で停止
pytest -x

# 3つ失敗したら停止
pytest --maxfail=3
```

## 📊 カバレッジレポート

```bash
# カバレッジ付きで実行
pytest --cov=app

# カバレッジ詳細表示（どの行がテストされていないか）
pytest --cov=app --cov-report=term-missing

# HTMLレポート生成
pytest --cov=app --cov-report=html
# その後 htmlcov/index.html をブラウザで開く

# XMLレポート生成（CI/CD用）
pytest --cov=app --cov-report=xml
```

## 🎯 テストの書き方

### 1. シンプルなテスト
```python
def test_addition():
    assert 1 + 1 == 2

def test_string():
    result = "Hello"
    assert result == "Hello"
    assert len(result) == 5
```

### 2. クラスベースのテスト
```python
class TestCalculator:
    """関連するテストをグループ化"""
    
    def test_add(self):
        assert 2 + 2 == 4
    
    def test_subtract(self):
        assert 5 - 3 == 2
```

### 3. フィクスチャの使用
```python
import pytest

@pytest.fixture
def sample_data():
    """テスト前に実行される準備処理"""
    return {"name": "Test", "value": 100}

def test_with_fixture(sample_data):
    """フィクスチャを引数として受け取る"""
    assert sample_data["name"] == "Test"
    assert sample_data["value"] == 100
```

### 4. セットアップとティアダウン
```python
@pytest.fixture
def database_connection():
    """テスト前後の処理"""
    # Setup: テスト前の準備
    db = create_database()
    
    yield db  # テストに渡す
    
    # Teardown: テスト後のクリーンアップ
    db.close()

def test_database(database_connection):
    database_connection.insert({"id": 1, "name": "test"})
    assert database_connection.count() == 1
```

### 5. パラメータ化テスト
```python
import pytest

@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (4, 8),
])
def test_double(input, expected):
    """複数のケースを一度にテスト"""
    assert input * 2 == expected
```

### 6. 例外のテスト
```python
import pytest

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def test_divide_by_zero():
    """例外が発生することを確認"""
    with pytest.raises(ValueError) as exc_info:
        divide(10, 0)
    
    assert "Cannot divide by zero" in str(exc_info.value)
```

### 7. マーカーの使用
```python
import pytest

@pytest.mark.slow
def test_slow_operation():
    """時間のかかるテスト"""
    # 重い処理
    pass

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    """スキップするテスト"""
    pass

@pytest.mark.skipif(sys.version_info < (3, 10), reason="Requires Python 3.10+")
def test_new_syntax():
    """条件付きスキップ"""
    pass

@pytest.mark.xfail
def test_known_bug():
    """失敗が予想されるテスト"""
    assert False
```

```bash
# マーカーで実行を制御
pytest -m "not slow"  # slowマーカー以外を実行
pytest -m "slow"      # slowマーカーのみ実行
```

## 🔧 FastAPI のテスト

### 1. TestClient の使用
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}
```

### 2. 認証付きリクエスト
```python
def test_protected_endpoint():
    headers = {"Authorization": "Bearer fake-token"}
    response = client.get("/api/protected", headers=headers)
    assert response.status_code == 200
```

### 3. POSTリクエスト
```python
def test_create_item():
    data = {"title": "Test", "description": "Test desc"}
    response = client.post("/api/items", json=data)
    assert response.status_code == 200
    assert response.json()["title"] == "Test"
```

## 📁 プロジェクト構成

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   └── endpoints/
├── tests/
│   ├── __init__.py
│   ├── conftest.py      # 共通フィクスチャ
│   ├── test_auth.py     # 認証テスト
│   └── test_todo.py     # Todoテスト
├── pytest.ini           # pytest設定
└── requirements.txt
```

## ⚙️ pytest.ini 設定例

```ini
[pytest]
# テストディレクトリ
testpaths = tests

# テストファイルのパターン
python_files = test_*.py

# テストクラスのパターン
python_classes = Test*

# テスト関数のパターン
python_functions = test_*

# デフォルトオプション
addopts = 
    -v
    --strict-markers
    --tb=short
    --cov=app
    --cov-report=term-missing

# 非同期テスト対応
asyncio_mode = auto
```

## 🎨 出力のカスタマイズ

```bash
# トレースバック（エラー表示）のスタイル
pytest --tb=short   # 短縮表示
pytest --tb=long    # 詳細表示
pytest --tb=no      # 非表示

# 出力の詳細度
pytest -v           # 詳細
pytest -vv          # より詳細
pytest -q           # 簡潔

# 実行時間の表示
pytest --durations=10  # 最も遅い10個のテストを表示

# 標準出力を表示
pytest -s           # printデバッグが見える
```

## 🐛 デバッグ

```python
def test_debug_example():
    value = calculate_something()
    
    # デバッガーを起動
    import pdb; pdb.set_trace()
    
    assert value == expected
```

```bash
# pdbデバッガー付きで実行
pytest --pdb  # 失敗時に自動でpdbを起動
```

## 📈 よく使うアサーション

```python
# 等価
assert a == b
assert a != b

# 真偽値
assert value
assert not value
assert value is True
assert value is None

# 数値比較
assert a > b
assert a >= b
assert a < b
assert a <= b

# 含まれているか
assert "text" in string
assert item in list_items
assert key in dictionary

# 型チェック
assert isinstance(obj, MyClass)

# 長さ
assert len(list_items) == 5

# 近似値（浮動小数点）
assert value == pytest.approx(0.1 + 0.2)  # 0.30000000000000004 問題を回避
```

## 🔍 よく使うコマンド組み合わせ

```bash
# 開発中によく使う
pytest -v -x -s                    # 詳細、最初の失敗で停止、標準出力表示

# CI/CDでよく使う
pytest --cov=app --cov-report=xml  # カバレッジXMLレポート

# デバッグ時
pytest -v -s --lf --pdb            # 失敗したテストのみ再実行、デバッガー起動

# パフォーマンスチェック
pytest --durations=0               # すべてのテストの実行時間表示
```

## 📝 実践例：現在のプロジェクト

```bash
# Dockerコンテナ内でテスト実行
docker-compose run --rm backend pytest -v

# カバレッジ付き
docker-compose run --rm backend pytest --cov=app --cov-report=term-missing

# 特定のテストのみ
docker-compose run --rm backend pytest tests/test_todo.py -v

# 認証関連のテストのみ
docker-compose run --rm backend pytest -k "auth" -v

# HTMLカバレッジレポート生成
docker-compose run --rm backend pytest --cov=app --cov-report=html
```

## 🎓 学習のコツ

1. **小さく始める**: まず簡単なテストから
2. **AAA パターン**: Arrange（準備）, Act（実行）, Assert（検証）
3. **1テスト1確認**: 1つのテストで1つのことだけをテスト
4. **テスト名は説明的に**: `test_user_can_login_with_valid_credentials`
5. **フィクスチャを活用**: 重複コードを減らす

## 📚 参考リソース

- [pytest公式ドキュメント](https://docs.pytest.org/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
