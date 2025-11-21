"""
pytestの実行順序を確認するテスト
"""

import pytest

print("1. test_execution_order.py がimportされた")

from app.models.todo import Todo

print("2. Todo モデルがimportされた")


class TestExecutionOrder:
    """実行順序確認用のテストクラス"""

    print("3. TestExecutionOrderクラスが定義された")

    def test_sample(self, db_session, client):
        """サンプルテスト"""
        print("7. test_sample が実行されている")
        assert True
