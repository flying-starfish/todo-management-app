"""
TestClientの動作デモ
"""

from fastapi.testclient import TestClient

from app.main import app

# TestClientを作成
client = TestClient(app)

print("\n=== TestClient デモ ===\n")

# 1. GETリクエスト
print("1. GET リクエスト:")
response = client.get("/")
print(f"   URL: /")
print(f"   Status Code: {response.status_code}")
print(f"   Response: {response.json()}")

# 2. POSTリクエスト（ユーザー登録）
print("\n2. POST リクエスト (ユーザー登録):")
register_data = {"email": "demo@example.com", "password": "demopassword"}
response = client.post("/api/auth/register", json=register_data)
print(f"   URL: /api/auth/register")
print(f"   Status Code: {response.status_code}")
print(f"   Response: {response.json()}")

# 3. 認証が必要なエンドポイントへのアクセス（認証なし）
print("\n3. 認証なしでアクセス:")
response = client.get("/api/todos")
print(f"   URL: /api/todos")
print(f"   Status Code: {response.status_code}")

# 4. 認証ありでアクセス
print("\n4. 認証ありでアクセス:")
# ログイン
login_response = client.post("/api/auth/login", data={"username": "demo@example.com", "password": "demopassword"})
token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Todo取得
response = client.get("/api/todos", headers=headers)
print(f"   URL: /api/todos")
print(f"   Status Code: {response.status_code}")
print(f"   Response: {response.json()}")

print("\n=== デモ終了 ===\n")
