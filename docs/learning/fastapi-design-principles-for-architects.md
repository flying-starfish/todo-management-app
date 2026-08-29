# FastAPI で学んだ設計思想が他のフレームワークでも活きる

この資料は、FastAPI を「実装の細部」だけでなく、
「アーキテクトが設計を考えるときの原則」としてどう捉えるかを整理したものです。

今回のプロジェクトで見てきた内容は、FastAPI 固有の書き方ではなく、
ほとんどの Web フレームワークに通じる設計思想の学びとして使えます。

---

## 1. そもそも、FastAPI は特別なフレームワークではなく「設計思想の良い例」

FastAPI を学ぶとき、初学者は次のような視点に陥りやすいです。

- URL の書き方
- `Depends()` の使い方
- `BaseModel` の使い方
- `async def` と `def` の違い

もちろん、これらは重要です。

しかしアーキテクトの視点では、より大事なのは次のような設計思想です。

- アプリケーションの入口と業務ロジックを分離しているか
- 共通の横断的関心事をどこで処理するか
- リクエストごとに生成される状態と起動時に固定される状態を分けているか
- 依存関係が「暗黙的」ではなく「明示的」になっているか
- API の境界で入力と出力の契約を明確にしているか

FastAPI は、そのような設計思想を比較的明確に表現しやすいフレームワークです。

---

## 2. 実際に学んだ設計思想

### 2-1. 起動時とリクエスト時を分離できている

このプロジェクトでは、

- [backend/app/main.py](../backend/app/main.py) にて `FastAPI()` を作り、router を登録する
- [backend/app/core/database.py](../backend/app/core/database.py) で engine と SessionLocal を定義する
- `get_db()` で request ごとにセッションを作る

といったように、起動時と実行時が分離されています。

これは設計上の重要な原則です。

#### 重要な観点

- アプリケーションの設定は起動時に固定する
- request ごとに変わる状態は別の層で扱う
- 一つの関数やクラスが、起動時設定とリクエスト時の処理を混ぜない

これは他のフレームワークでも共通です。

- Express や NestJS でも、アプリケーション初期化と request handler は分けて考える
- Spring でも `Bean` の構成と request processing は別の層で管理する
- Django でも setting と view 関数の責務は分離される

つまり、FastAPI で身につけた「初期化と実行の分離」は、他のフレームワークでもそのまま応用できます。

---

### 2-2. 依存注入は「機能の組み立て」ではなく「境界の設計」である

このプロジェクトでは、

- `get_db()`
- `get_current_user()`
- `get_current_active_user()`

が依存として連なっています。

これは単なる「便利な引数」ではなく、

- 認証の境界
- DB の境界
- 権限の境界
- 事業ロジックの境界

を明示する設計です。

#### 他のフレームワークへの応用

- Spring: Controller と Service と Security の境界設計に近い
- NestJS: Guard, Interceptor, Middleware との関係を理解しやすくなる
- ASP.NET Core: Middleware と DI と Authorization Policy の考え方と対応する
- Django: authentication backend と view の責務分離との対応が見えやすい

FastAPI の `Depends()` に慣れると、

> 「依存関係をどう明示し、処理の責務を分離するか」

という設計の基本が見えるようになります。

これはアーキテクトにとって非常に重要です。

---

### 2-3. 入出力の契約を明確にすることが、設計の安定性を高める

このプロジェクトでは、

- `TodoCreate`
- `TodoResponse`
- `UserCreate`
- `Token`

のように Pydantic スキーマが使われています。

ここで大事なのは、

- どんな値を受け取るか
- どんな形式で返すか
- どんなバリデーションが必要か

が型で表現されていることです。

#### これは設計思想として非常に大事

API の境界では、入力と出力の契約を明示しないと、

- パラメータの意味が曖昧になる
- ブラウザや他サービスの実装者が迷う
- バリデーションが散乱する
- 変更時に影響範囲が広がる

といった問題が起こります。

これは他のフレームワークでも同じです。

- TypeScript では zod / io-ts / class-validator といった境界データ定義
- Java では DTO と Bean Validation
- C# では record / validation attributes
- Python 以外でも API の入力契約の明確化は共通課題

FastAPI はその設計が非常に「視覚的」に分かりやすいので、
アーキテクトとしては他のアプリケーションでも同じ原則を運用できるように学べます。

---

### 2-4. セキュリティは endpoint に書かず、境界層で管理する

このプロジェクトでは、認証は以下のように分かれています。

- [backend/app/core/security.py](../backend/app/core/security.py): JWT とパスワードハッシュ
- [backend/app/core/dependencies.py](../backend/app/core/dependencies.py): 認証依存
- [backend/app/endpoints/auth.py](../backend/app/endpoints/auth.py): 認証 API

つまり、

- セキュリティロジックは endpoint にハードコードしない
- その前に依存層や境界層で処理する

という設計になっています。

#### これが意味すること

これは、Web アプリの設計における重要な普遍原則です。

- 事業ロジックは安全な前提で動くべき
- 認証と権限チェックは API の入口で処理する
- 例外や失敗時の応答は統一して扱う

他のフレームワークでも、

- NestJS の Guard / AuthGuard
- Spring Security の Filter / AuthenticationManager
- ASP.NET Core の AuthorizationPolicy
- Django の authentication backend / permissions

といった仕組みが、実質的には同じ考え方です。

つまり、FastAPI で学んだ「セキュリティの境界設計」は、他のフレームワークの設計を理解する上での基本モデルになります。

---

### 2-5. ミドルウェアは横断的関心事の司令塔である

[backend/app/main.py](../backend/app/main.py) では、

- CORS
- security headers
- request logging
- response processing

がミドルウェアとして実装されています。

この設計は、重要なアーキテクト視点です。

#### なぜ重要か

API では、以下のような処理を各 endpoint に書くと、コードが複雑化します。

- CORS 許可
- ログ出力
- 監査
- XSS 対策
- セキュリティヘッダー
- エラー記録

ミドルウェアや横断処理層にまとめると、

- ルールが一元管理される
- 変更がしやすい
- endpoint が本来の責務に集中できる

という利点があります。

これは、他のフレームワークでもほぼ共通です。

- Express: middleware
- NestJS: middleware / interceptor
- Spring: filter / aspect
- ASP.NET Core: middleware pipeline

FastAPI のミドルウェアに慣れると、横断的関心事をどう設計するかの感覚が養われます。

---

### 2-6. アーキテクチャの重要な視点は「境界を明確にすること」

FastAPI を通して学んだ最大の設計思想は、次の 1 文に集約できます。

> 境界を明確にし、各層が「自分の責務」に集中できるようにする

このプロジェクトでは、以下の境界が明確です。

- app entry と router
- endpoint と request validation
- dependency と auth logic
- DB session と business logic
- security policy と endpoint logic
- middleware と route logic

これが明確であると、

- 規模が大きくなっても設計が崩れにくい
- テストがしやすい
- 保守がしやすい
- リファクタリングがしやすい

という利点が生まれます。

これは FastAPI を超えて、どのアーキテクチャにも当てはまる原則です。

---

## 3. 他のフレームワークに置き換えるとどう見えるか

### FastAPI と Express / NestJS を比較する

FastAPI の `route + dependency + schema` は、

- Express では route handler + middleware + validation middleware
- NestJS では controller + guard + interceptor + DTO

と対応関係を持ちます。

同じように、

- `Depends()` の役割は依存注入や Guard に相当する
- `BaseModel` の役割は DTO / validation schema に相当する
- `middleware` の役割は global middleware / interceptor に相当する

理解の軸が揃うと、フレームワーク名が変わっても本質は同じだと見えます。

---

### FastAPI と Spring / ASP.NET Core を比較する

FastAPI の設計思想は、

- Spring の Controller / Service / Repository / Security の分離
- ASP.NET Core の Middleware / Controller / Authorization Policy / Dependency Injection

と非常に相性が良いです。

#### 共通する概念

- HTTP の入口を管理する層
- 入出力を検証する層
- 認証と認可を行う境界
- DB との接続を閉じる責務
- アプリケーション起動時の設定管理

同じ設計の語彙に置き換えると、FastAPI を使った時の感覚が他の ecosystem でも使い回せます。

---

## 4. アーキテクトとしての学び

FastAPI で学んだ設計思想は、単に「このフレームワークの書き方」を超えて、
次のような思考法を身につけることに繋がります。

### 4-1. どこが boundary なのかを見抜く

- 認証はどこで行われるのか
- DB 接続はどこで生成されるのか
- request の入力はどこで検証されるのか
- 一番外側と中核の責務が分離されているか

### 4-2. どこで責務を分けるべきかを考える

- endpoint に書くべきことは何か
- middleware や dependency に任せるべきことは何か
- service 層や use case 層に置くべき責務は何か

### 4-3. 変化に強い設計を意識する

- 失敗時の振る舞いが明確か
- 依存が一箇所で管理されているか
- 監査や認証を横断的に扱えるか
- 境界の変更が最小限で済むか

このような設計視点は、どのフレームワークでも通用します。

---

## 5. 一番大事な結論

FastAPI の経験を他のフレームワークで活かすなら、

> 「このフレームワークの構文」ではなく、
> 「その構文が表している設計原則」を捉える

ことが最も重要です。

このプロジェクトで学んだのは、

- 初期化と実行の分離
- 依存の境界
- 入出力契約の明確化
- 認証と権限の入口設計
- 横断的関心事の集約
- 例外と責務の明確化

という設計原則です。

これらは FastAPI に固有のものではなく、
ほぼすべての Web アーキテクチャに通じる思考法です。

---

## 6. 最後に

FastAPI は、初心者には「具体的な API の書き方」を教えてくれます。
しかしアーキテクトとしては、

- 何を分離したか
- どこが境界なのか
- どこで契約を守るのか
- どこでセキュリティを担保するのか

を見抜く学びとして使うと、非常に強い価値があります。

次の学習では、こうした原則を実際に WebSocket や DB transaction、
あるいは React との疎通設計に落とし込んで見ていくと、さらに実務的な設計感覚が養われます。
