"""
アプリケーション設定
環境変数から設定を読み込む
"""

import os
from typing import List


class Settings:
    """アプリケーション設定"""

    # 環境（development, staging, production）
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # デバッグモード
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # セキュリティ設定
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")

    # CORS設定
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://frontend:3000",
    ]

    @property
    def is_production(self) -> bool:
        """本番環境かどうか"""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """開発環境かどうか"""
        return self.ENVIRONMENT == "development"

    def get_csp_policy(self) -> str:
        """
        環境に応じたContent Security Policyを取得

        開発環境: ViteのHMRとReactの動作のため緩い設定
        本番環境: 厳格な設定でXSS攻撃を防御
        """
        if self.is_development:
            # 開発環境用CSP（Vite HMR対応）
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # 開発時のみ許可
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss:; "  # WebSocket（HMR用）
                "frame-ancestors 'none'"
            )
        else:
            # 本番環境用CSP（厳格）
            return (
                "default-src 'self'; "
                "script-src 'self'; "  # unsafe-inline, unsafe-evalを削除
                "style-src 'self'; "  # unsafe-inlineを削除
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "  # WebSocketを削除
                "frame-ancestors 'none'; "
                "base-uri 'self'; "  # ベースURIを制限
                "form-action 'self'; "  # フォーム送信先を制限
                "upgrade-insecure-requests"  # HTTPをHTTPSにアップグレード
            )

    def get_hsts_header(self) -> str:
        """
        環境に応じたStrict-Transport-Securityヘッダーを取得
        """
        if self.is_production:
            # 本番環境: 1年間HSTSを適用
            return "max-age=31536000; includeSubDomains; preload"
        else:
            # 開発環境: 短い期間（テスト用）
            return "max-age=31536000; includeSubDomains"


# シングルトンインスタンス
settings = Settings()
