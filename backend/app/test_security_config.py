"""
セキュリティ設定のテストスクリプト
異なる環境でのCSPポリシーを確認
"""
import os
import sys

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import Settings


def test_environment(env: str):
    """指定された環境の設定をテスト"""
    print(f"\n{'='*60}")
    print(f"環境: {env}")
    print(f"{'='*60}")
    
    # 環境変数を一時的に設定して、新しいインスタンスを作成
    original_env = os.environ.get("ENVIRONMENT")
    os.environ["ENVIRONMENT"] = env
    
    # 新しいSettingsインスタンスを作成（環境変数を再読み込み）
    settings = Settings()
    
    print(f"\n環境変数:")
    print(f"  ENVIRONMENT: {settings.ENVIRONMENT}")
    print(f"  DEBUG: {settings.DEBUG}")
    print(f"  is_production: {settings.is_production}")
    print(f"  is_development: {settings.is_development}")
    
    print(f"\nContent-Security-Policy:")
    csp = settings.get_csp_policy()
    for directive in csp.split("; "):
        print(f"  {directive}")
    
    print(f"\nStrict-Transport-Security:")
    print(f"  {settings.get_hsts_header()}")
    
    # セキュリティチェック
    print(f"\nセキュリティチェック:")
    has_unsafe_inline = "'unsafe-inline'" in csp
    has_unsafe_eval = "'unsafe-eval'" in csp
    has_ws = "ws:" in csp
    
    print(f"  ✓ 'unsafe-inline': {'含まれる (⚠️ 開発用)' if has_unsafe_inline else '含まれない (✅ 安全)'}")
    print(f"  ✓ 'unsafe-eval': {'含まれる (⚠️ 開発用)' if has_unsafe_eval else '含まれない (✅ 安全)'}")
    print(f"  ✓ WebSocket: {'許可 (⚠️ 開発用)' if has_ws else '禁止 (✅ 安全)'}")
    
    if env == "production":
        if has_unsafe_inline or has_unsafe_eval:
            print(f"\n  ❌ 警告: 本番環境でunsafeディレクティブが有効です！")
        else:
            print(f"\n  ✅ 本番環境の設定は安全です")
    
    # 環境変数を元に戻す
    if original_env:
        os.environ["ENVIRONMENT"] = original_env
    elif "ENVIRONMENT" in os.environ:
        del os.environ["ENVIRONMENT"]


if __name__ == "__main__":
    # 各環境をテスト
    test_environment("development")
    test_environment("production")
    
    print(f"\n{'='*60}")
    print("テスト完了")
    print(f"{'='*60}\n")
