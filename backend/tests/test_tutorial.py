"""
pytest チュートリアル用のサンプルテスト

このファイルでpytestの基本的な使い方を学べます
"""
import pytest


# ============================================
# 1. 基本的なテスト
# ============================================

def test_simple_assertion():
    """最もシンプルなテスト"""
    assert 1 + 1 == 2


def test_string_operations():
    """文字列のテスト"""
    text = "Hello, pytest!"
    assert "pytest" in text
    assert text.startswith("Hello")
    assert len(text) == 14


def test_list_operations():
    """リストのテスト"""
    numbers = [1, 2, 3, 4, 5]
    assert len(numbers) == 5
    assert 3 in numbers
    assert numbers[0] == 1


# ============================================
# 2. フィクスチャの使用
# ============================================

@pytest.fixture
def sample_user():
    """テスト用のユーザーデータを提供するフィクスチャ"""
    return {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "is_active": True
    }


def test_user_data(sample_user):
    """フィクスチャを使ったテスト"""
    assert sample_user["name"] == "Test User"
    assert sample_user["is_active"] is True


@pytest.fixture
def sample_todo_list():
    """複数のTodoデータを提供"""
    return [
        {"id": 1, "title": "Task 1", "completed": False},
        {"id": 2, "title": "Task 2", "completed": True},
        {"id": 3, "title": "Task 3", "completed": False},
    ]


def test_todo_count(sample_todo_list):
    """Todoの数を確認"""
    assert len(sample_todo_list) == 3


def test_completed_todos(sample_todo_list):
    """完了済みTodoの数を確認"""
    completed = [todo for todo in sample_todo_list if todo["completed"]]
    assert len(completed) == 1


# ============================================
# 3. パラメータ化テスト
# ============================================

@pytest.mark.parametrize("input,expected", [
    (2, 4),
    (3, 9),
    (4, 16),
    (5, 25),
])
def test_square(input, expected):
    """複数の入力値でテストを実行"""
    assert input ** 2 == expected


@pytest.mark.parametrize("priority,label", [
    (0, "High"),
    (1, "Medium"),
    (2, "Low"),
])
def test_priority_labels(priority, label):
    """優先度ラベルのマッピング"""
    priority_map = {0: "High", 1: "Medium", 2: "Low"}
    assert priority_map[priority] == label


# ============================================
# 4. 例外のテスト
# ============================================

def divide(a, b):
    """除算関数（ゼロ除算チェック付き）"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


def test_divide_success():
    """正常な除算"""
    result = divide(10, 2)
    assert result == 5.0


def test_divide_by_zero():
    """ゼロ除算で例外が発生することを確認"""
    with pytest.raises(ValueError) as exc_info:
        divide(10, 0)
    assert "Cannot divide by zero" in str(exc_info.value)


# ============================================
# 5. クラスベースのテスト
# ============================================

class TestCalculator:
    """電卓機能のテストグループ"""

    def test_add(self):
        assert 2 + 3 == 5

    def test_subtract(self):
        assert 10 - 4 == 6

    def test_multiply(self):
        assert 3 * 4 == 12

    def test_divide(self):
        assert 20 / 4 == 5.0


class TestTodoOperations:
    """Todo操作のテストグループ"""

    @pytest.fixture
    def todo(self):
        """各テストメソッドで使えるフィクスチャ"""
        return {
            "id": 1,
            "title": "Test Task",
            "completed": False,
            "priority": 1
        }

    def test_todo_creation(self, todo):
        """Todoの初期状態"""
        assert todo["title"] == "Test Task"
        assert todo["completed"] is False

    def test_complete_todo(self, todo):
        """Todoを完了にする"""
        todo["completed"] = True
        assert todo["completed"] is True

    def test_change_priority(self, todo):
        """優先度を変更"""
        todo["priority"] = 0
        assert todo["priority"] == 0


# ============================================
# 6. マーカーの使用
# ============================================

@pytest.mark.slow
def test_slow_operation():
    """時間のかかるテスト（実際には遅くない）"""
    result = sum(range(1000))
    assert result == 499500


@pytest.mark.skip(reason="まだ実装されていない機能")
def test_future_feature():
    """将来実装予定のテスト"""
    assert False  # このテストはスキップされる


@pytest.mark.xfail
def test_known_bug():
    """既知のバグ（失敗が予想される）"""
    assert 1 == 2  # 失敗するがテストは通る


# ============================================
# 7. セットアップとティアダウン
# ============================================

@pytest.fixture
def resource_manager():
    """リソースの準備とクリーンアップ"""
    # Setup: テスト前の準備
    print("\n[Setup] リソースを準備")
    resource = {"data": [], "connection": "open"}
    
    yield resource  # テストに渡す
    
    # Teardown: テスト後のクリーンアップ
    print("[Teardown] リソースをクリーンアップ")
    resource["connection"] = "closed"


def test_use_resource(resource_manager):
    """リソースを使用するテスト"""
    resource_manager["data"].append("test")
    assert len(resource_manager["data"]) == 1
    assert resource_manager["connection"] == "open"


# ============================================
# 8. 近似値のテスト（浮動小数点）
# ============================================

def test_floating_point():
    """浮動小数点の比較"""
    # 直接比較はNG（0.1 + 0.2 は 0.30000000000000004）
    # assert 0.1 + 0.2 == 0.3  # 失敗する可能性
    
    # pytest.approx を使う
    assert 0.1 + 0.2 == pytest.approx(0.3)
    assert 1.0 / 3.0 == pytest.approx(0.333, rel=1e-2)  # 相対誤差


# ============================================
# 実行方法:
# 
# すべてのテスト実行:
#   pytest tests/test_tutorial.py -v
#
# 特定のクラス実行:
#   pytest tests/test_tutorial.py::TestCalculator -v
#
# 特定のテスト実行:
#   pytest tests/test_tutorial.py::test_simple_assertion -v
#
# キーワード検索:
#   pytest tests/test_tutorial.py -k "todo" -v
#
# マーカーで実行:
#   pytest tests/test_tutorial.py -m "slow" -v
#   pytest tests/test_tutorial.py -m "not slow" -v
#
# 標準出力を表示:
#   pytest tests/test_tutorial.py -s -v
# ============================================
